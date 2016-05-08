var request  = require('request');
var $        = require('cheerio');
var md5      = require('md5');
var fs       = require('fs');
var moment   = require('moment');
var settings = require('./settings.json');

var INTERVAL = 600000;
var URL = 'http://hitaskoti.fi/haku_hakutulokset';


function fetch() {
	loadCache(function (cache) {
		request({
			uri: URL
		}, function (error, res, body) {
			var oks = [];

			$(body).find('table.taulu_tieto_lista').first().find('tr').map(function(i, item) {
				var $item = $(item);
				var hash = md5($item.text());
				var notTitle = $item.attr('class').indexOf('otsikko_tr') == -1;
				if ( cache.indexOf(hash) == -1 && notTitle ) {
					var itemOk = handle($item);
					if ( itemOk ) {
						oks.push($item.text());
					}
					cache.push(hash);
				} else {
					// console.log('old or something');
				}
			});

			if ( oks.length ) {
				fs.appendFile('found.txt', oks.join('\n') + '\n');
				console.log('Found ' + oks.length + ' new');
			} else {
				console.log('Nothing new');
			}

			saveCache(cache, function () {
				setTimeout(fetch, INTERVAL);
			});
		});
	});
}



function handle($item) {
	var info = $item.find('td').eq(1).text();
	var size = parseFloat($item.find('td').eq(2).text());
	var cost = parseFloat($item.find('td').eq(3).text().split('�')[0].replace(/\W/, ''));

	if ( checkExchangeOnly($item) ) {
		return false;
	}

	if ( !checkLocation(info) ) {
		return false;
		// console.log('checkLocation not ok');
	}

	if ( !checkType(info) ) {
		return false;
		// console.log('checkType not ok');
	}

	if ( !checkRooms(info) ) {
		return false;
		// console.log('checkRooms not ok');
	}

	if ( !checkSize(size) ) {
		return false;
		// console.log('checkSize not ok');
	}

	if ( !checkCost(cost) ) {
		return false;
		// console.log('checkCost not ok');
	}

	console.log('FOUND ONE', cost, 'e\t', size, '\t',info );
	return true;
}



function checkExchangeOnly($item) {
	var exchangeOnly = false;
	$item.find('img').each(function (i, img) {
		var imgSrc = $(img).attr('src');
		if ( imgSrc.indexOf('vain_vaihto') != -1 ) {
			exchangeOnly = true;
			return false;
		}
	});
	return exchangeOnly;
}

function checkLocation(info) {
	return info.toLowerCase().indexOf( settings.location ) != -1;
}

function checkType(info) {
	return info.toLowerCase().indexOf( settings.type ) != -1;
}

function checkRooms(info) {
	var ok = false;
	for ( var i = settings.rooms[0]; i <= settings.rooms[1]; i++ ) {
		if ( info.toLowerCase().indexOf( i + 'h' ) != -1 ) {
			ok = true;
		}
	}
	return ok;
}

function checkCost(cost) {
	return settings.cost[0] <= cost && cost <= settings.cost[1];
}

function checkSize(size) {
	return settings.size[0] <= size && size <= settings.size[1];
}



function loadCache(callback) {
	var file = '.cache/day_' + moment().dayOfYear();
	fs.exists(file, function (found) {
		if ( found ) {
			fs.readFile(file, 'utf8', function(error, data) {
				callback(data.split('\n'));
			});
		} else {
			callback([]);
		}
	});
}



function saveCache(cache, callback) {
	if ( !cache || !cache.length ) {
		callback();
		return false;
	}
	var file = '.cache/day_' + moment().dayOfYear();
	fs.truncate(file, 0, function() {
		fs.writeFile(file, cache.join('\n'), callback || function() {});
	});
}



function buildDirs(callback) {
	fs.exists('.cache', function(found){
		if ( !found ) {
			fs.mkdir('.cache', callback);
		} else {
			callback();
		}
	});
}


// Init shit
buildDirs(fetch);
