var http = require('http');
var dispatcher = require('httpdispatcher');

/******Configurazione dell'utente admin e del server couchdb**********/

var admin = {
	name : '',
	password : ''
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

var optionsNick = {
	host: options.host,
	port: options.port,
	auth: options.auth,
	method: 'GET'
};
/**********************************************************************/

/* crea un header in grado di rispondere alle richieste che usano CORS 
 * origin (string) host dal quale proviene la richiesta
 * otherHeader (object) parametro opzionale, un oggetto contenente altri campi header da aggiungere a quello creato */
var makeCorsHeader = function(origin, otherHeaders){
	var header = {};
	if (otherHeaders)
		header = otherHeaders;

	header['Access-Control-Allow-Origin'] = origin,
	header['Access-Control-Allow-Methods'] = 'GET, PUT, POST, HEAD, DELETE',
	header['Access-Control-Allow-Headers'] = 'authorization, x-titanium-id, content-type',
	header['Access-Control-Allow-Credentials'] = 'true'
	
	return header;
};


dispatcher.onOptions("/_users", function(req, res){
	res.writeHead(204, makeCorsHeader(req.headers.origin));
	res.end();
});

dispatcher.onPost("/_users", function(appReq, appRes) {
	/* controllo se il nick dell'utente che si vuole registrare non sia già utilizzato */ 
	console.log("Ricevuta Richiesta di registrazione dall'app");
	var userToSignup = JSON.parse(appReq.body);

	optionsNick.path='/_users/_design/usersQueries/_view/allNickandMail?key="'+userToSignup.nick +'"';

	var nickResBody= '';
	var nickRequest = http.request(optionsNick, function(nickRes){
		/* ricostruisce lo stream di dati ricevuto dal server couchdb */
		nickRes.on('data', function(nickResChunk){
			nickResBody += nickResChunk;
		});
		/* eseguita quando lo stream di dati è terminato */
		nickRes.on('end', function(){
			var jsonNickResBody = JSON.parse(nickResBody);
			/* in questo caso il nick name è già stato usato da qualche altro utente quindi comunico all'app il conflitto*/
			if (jsonNickResBody.rows.length > 0){
				var appResHeader = makeCorsHeader(appReq.headers.origin, nickRes.headers);
				appRes.writeHead(409, appResHeader);
				var msgNickDup = {
					"error":"conflict",
					"reason": "Document update conflict.",
					"nickDuplicate": true
				};
				/*console.log("Invio risposta all'app: -Nick duplicato-");*/
				appRes.end(JSON.stringify(msgNickDup));
			}
			else{
				/* in questo caso il nick name NON è già stato usato da qualche altro utente quindi inoltro la richiesta di registrazione al server couchdb*/
				var signupRequest = http.request(options, function(signupRes){
					/* se la richiestra di registrazione è stata inoltrata correttamente 
					 * rispondo all'applicazione con la risposta ricevuta dal server couchdb
					 */	
					signupRes.on('data', function (signupResBody) {
						var signupResHeader = makeCorsHeader(appReq.headers.origin, signupRes.headers);

					  	appRes.writeHead(signupRes.statusCode, signupResHeader);
						/*console.log("Invio risposta all'app: -Risultato Registrazione-");*/
			  			appRes.end(signupResBody);
					});
					/* se la richiestra di registrazione NON è stata inoltrata correttamente 
					 * rispondo all'applicazione che la registrazioone
					 * NON ha avuto successo*/
					signupRequest.on('error', function(e){
						/*console.log('Impossibile inoltrare la richiesta di registrazione: ' + e.message);*/
			  			appRes.end('Registrazione NON eseguita\n');
					});
				}).on('error', function(err){
					/* server couchdb non disponibile */
					appRes.writeHead(503, makeCorsHeader(appReq.headers.origin));
					appRes.end();
					console.log('Impossibile inoltrare la richiesta di registrazione: ' + e.message);
				});
				/*console.log("Invio al server couchdb la richiesta di registrazione dato che il nick non è duplicato");*/
				signupRequest.end(appReq.body);
			}
		});
	}).on('error', function(e){
		/* server couchdb non disponibile */
		appRes.writeHead(503, makeCorsHeader(appReq.headers.origin));
		appRes.end();
		console.log('Impossibile inoltrare la richiesta di registrazione: ' + e.message);
	});
	/*console.log("Invio richiesta al server couchdb per vedere se il nick è duplicato");*/
	nickRequest.end();
});

/*******************************************************************/

dispatcher.onError(function(req, res) {
	res.writeHead(404, {'Content-Type': 'text/plain'});
  	res.end('Page Not Found\n');
});

var server = http.createServer(function (req, res) {
  dispatcher.dispatch(req, res);
})
 
server.listen(1338, '192.168.0.103');

console.log('Server running at http://pram.homepc.it:1338/');
