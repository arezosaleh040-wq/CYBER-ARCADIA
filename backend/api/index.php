<?php
declare(strict_types=1);
/* CYBER-ARCADIA API. Requires PHP 8.1+, PDO MySQL. Deploy on a PHP host, not GitHub Pages. */
$configFile=__DIR__.'/../config.php';
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
if(!is_file($configFile)){http_response_code(503);echo json_encode(['ok'=>false,'error'=>'server_not_configured']);exit;}
$config=require $configFile;
$origin=$_SERVER['HTTP_ORIGIN']??'';
$allowed=(string)($config['app']['allowed_origin']??'');
if($origin!==''&&hash_equals($allowed,$origin)){header('Access-Control-Allow-Origin: '.$allowed);header('Access-Control-Allow-Credentials: true');header('Vary: Origin');}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
if($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}
session_name((string)($config['app']['session_name']??'cyber_arcadia_session'));
session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>(bool)($config['app']['secure_cookies']??true),'httponly'=>true,'samesite'=>'Lax']);
session_start();
function out(int $code,array $data):never{http_response_code($code);echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
function input():array{$v=json_decode(file_get_contents('php://input')?:'{}',true);return is_array($v)?$v:[];}
function csrf():void{$a=$_SERVER['HTTP_X_CSRF_TOKEN']??'';$b=$_SESSION['csrf']??'';if(!$a||!$b||!hash_equals($b,$a))out(419,['ok'=>false,'error'=>'csrf_failed']);}
function user():array{if(empty($_SESSION['user']))out(401,['ok'=>false,'error'=>'authentication_required']);return $_SESSION['user'];}
function admin():array{$u=user();if(($u['role']??'')!=='admin')out(403,['ok'=>false,'error'=>'admin_required']);return $u;}
try{$d=$config['db'];$pdo=new PDO(sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s',$d['host'],$d['port']??3306,$d['name'],$d['charset']??'utf8mb4'),$d['user'],$d['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);}
catch(Throwable $e){error_log('CYBER-ARCADIA DB: '.$e->getMessage());out(503,['ok'=>false,'error'=>'database_unavailable']);}
$method=$_SERVER['REQUEST_METHOD'];$route='/'.ltrim((string)($_GET['route']??''),'/');
if($method==='GET'&&$route==='/health')out(200,['ok'=>true,'service'=>'cyber-arcadia-api']);
if($method==='GET'&&$route==='/csrf'){$_SESSION['csrf']=bin2hex(random_bytes(32));out(200,['ok'=>true,'csrf'=>$_SESSION['csrf']]);}
if($method==='POST'&&$route==='/register'){
 csrf();$v=input();$name=trim((string)($v['username']??''));$email=filter_var((string)($v['email']??''),FILTER_VALIDATE_EMAIL);$pass=(string)($v['password']??'');
 if(!preg_match('/^[a-zA-Z0-9_]{3,24}$/',$name)||!$email||strlen($pass)<10||strlen($pass)>200)out(422,['ok'=>false,'error'=>'invalid_registration']);
 try{$q=$pdo->prepare('INSERT INTO users(username,email,password_hash) VALUES(?,?,?)');$q->execute([$name,$email,password_hash($pass,PASSWORD_DEFAULT)]);}
 catch(PDOException $e){if($e->getCode()==='23000')out(409,['ok'=>false,'error'=>'account_exists']);throw $e;}
 session_regenerate_id(true);$_SESSION['user']=['id'=>(int)$pdo->lastInsertId(),'username'=>$name,'role'=>'player'];out(201,['ok'=>true,'user'=>$_SESSION['user']]);
}
if($method==='POST'&&$route==='/login'){
 csrf();$v=input();$login=trim((string)($v['login']??''));$pass=(string)($v['password']??'');$q=$pdo->prepare('SELECT id,username,email,password_hash,role FROM users WHERE username=? OR email=? LIMIT 1');$q->execute([$login,$login]);$r=$q->fetch();
 if(!$r||!password_verify($pass,$r['password_hash']))out(401,['ok'=>false,'error'=>'invalid_credentials']);
 if(password_needs_rehash($r['password_hash'],PASSWORD_DEFAULT)){$q=$pdo->prepare('UPDATE users SET password_hash=? WHERE id=?');$q->execute([password_hash($pass,PASSWORD_DEFAULT),$r['id']]);}
 session_regenerate_id(true);$_SESSION['user']=['id'=>(int)$r['id'],'username'=>$r['username'],'role'=>$r['role']];out(200,['ok'=>true,'user'=>$_SESSION['user']]);
}
if($method==='POST'&&$route==='/logout'){csrf();$_SESSION=[];session_regenerate_id(true);out(200,['ok'=>true]);}
if($method==='GET'&&$route==='/me')out(200,['ok'=>true,'user'=>$_SESSION['user']??null]);
if($method==='POST'&&$route==='/scores'){
 csrf();$u=user();$v=input();$game=trim((string)($v['game_key']??''));$score=filter_var($v['score']??null,FILTER_VALIDATE_INT);
 if(!preg_match('/^[a-z0-9_-]{2,40}$/',$game)||$score===false||$score<0||$score>100000000)out(422,['ok'=>false,'error'=>'invalid_score']);
 $q=$pdo->prepare('INSERT INTO scores(user_id,game_key,score) VALUES(?,?,?)');$q->execute([$u['id'],$game,$score]);out(201,['ok'=>true,'score_id'=>(int)$pdo->lastInsertId()]);
}
if($method==='GET'&&$route==='/leaderboard'){$q=$pdo->query('SELECT u.username,s.game_key,MAX(s.score) best_score FROM scores s JOIN users u ON u.id=s.user_id GROUP BY u.id,u.username,s.game_key ORDER BY best_score DESC LIMIT 50');out(200,['ok'=>true,'items'=>$q->fetchAll()]);}
if($method==='GET'&&$route==='/admin/overview'){
 admin();$stats=['users'=>(int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn(),'scores'=>(int)$pdo->query('SELECT COUNT(*) FROM scores')->fetchColumn(),'games'=>(int)$pdo->query('SELECT COUNT(*) FROM games')->fetchColumn()];
 $recent=$pdo->query('SELECT id,username,email,role,created_at FROM users ORDER BY id DESC LIMIT 10')->fetchAll();out(200,['ok'=>true,'stats'=>$stats,'recent_users'=>$recent]);
}
if($method==='GET'&&$route==='/admin/games'){admin();$q=$pdo->query('SELECT id,game_key,title,enabled,created_at FROM games ORDER BY id DESC');out(200,['ok'=>true,'games'=>$q->fetchAll()]);}
if($method==='POST'&&$route==='/admin/games'){
 csrf();admin();$v=input();$key=trim((string)($v['game_key']??''));$title=trim((string)($v['title']??''));
 if(!preg_match('/^[a-z0-9_-]{2,40}$/',$key)||$title===''||mb_strlen($title)>100)out(422,['ok'=>false,'error'=>'invalid_game']);
 $q=$pdo->prepare('INSERT INTO games(game_key,title) VALUES(?,?) ON DUPLICATE KEY UPDATE title=VALUES(title)');$q->execute([$key,$title]);out(200,['ok'=>true]);
}
out(404,['ok'=>false,'error'=>'route_not_found']);
