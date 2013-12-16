var http = require('http');
var dispatcher = require('httpdispatcher');

/******Configurazione dell'utente admin e del server couchdb**********/

var admin = {
	name : 'pratesim',
	password : 'cou111Viola<3'
};

var options = {
	host:'192.168.0.111',
	port: 5984,
	auth: admin.name+':'+admin.password,
	path: '/_users',
	headers: {
		'Content-type':'application/json'
	},
	method: 'POST'
};
/**********************************************************************/

dispatcher.onOptions("/_users", function(req, res){
	res.writeHead(204, {'Access-Control-Allow-Origin':req.headers.origin,
		'Access-Control-Allow-Methods': 'GET, PUT, POST, HEAD, DELETE',
		'Access-Control-Allow-Headers': 'authorization, x-titanium-id, content-type',
		'Access-Control-Allow-Credentials': 'true'
	});
	res.end();
});

dispatcher.onPost("/_users", function(appReq, appRes) {
	/* richiesta di registrazione utente inoltrata al server couchdb */
	var signupRequest = http.request(options, function(signupRes){
		/* se la richiestra di registrazione è stata inoltrata correttamente 
		 * rispondo all'applicazione con la risposta ricevuta dal server couchdb
		 */	
		signupRes.on('data', function (signupResBody) {
			var signupResHeader = signupRes.headers;
			signupResHeader['Access-Control-Allow-Origin'] = appReq.headers.origin;
			signupResHeader['Access-Control-Allow-Methods'] = 'GET, PUT, POST, HEAD, DELETE';
			signupResHeader['Access-Control-Allow-Headers'] = 'authorization, x-titanium-id, content-type';
			signupResHeader['Access-Control-Allow-Credentials'] = 'true';

		  	appRes.writeHead(signupRes.statusCode, signupRes.headers);
  			appRes.end(signupResBody);
			console.log("Risposta inviata"); 
		});
		/* se la richiestra di registrazione NON è stata inoltrata correttamente 
		 * rispondo all'applicazione che la registrazioone
		 * NON ha avuto successo*/
		signupRequest.on('error', function(e){
			console.log('Impossibile inoltrare la richiesta di registrazione: ' + e.message);
  			appRes.end('Registrazione NON eseguita\n');
		});
	});
	signupRequest.end(appReq.body);
	/*******************************************************************/
}); 

dispatcher.onError(function(req, res) {
	res.writeHead(404, {'Content-Type': 'text/plain'});
  	res.end('Page Not Found\n');
});

var server = http.createServer(function (req, res) {
  dispatcher.dispatch(req, res);
})
 
server.listen(1338, '192.168.0.103');

console.log('Server running at http://pram.homepc.it:1338/');
