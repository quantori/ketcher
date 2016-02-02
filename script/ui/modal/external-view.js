var queryString = require('query-string');
var molfile = require('../../chem/molfile');

var ui = global.ui;

function initFrame(iframe, url) {
	if (iframe.src && iframe.src != 'about:blank')
		return Promise.resolve(iframe.contentWindow);

	return new Promise(function (resolve, reject) {
		iframe.onload = function (e) {
			// resolve(iframe);
			window.addEventListener('message', function onload(event) { // old IE makes never mind
				if (event.origin == origin(url) && event.data == 'miewLoadComplete') {
					window.removeEventListener('message', onload);
					resolve(iframe.contentWindow);
				}
			});
		};
		iframe.onerror = function (e) {
			reject(e);
		};
		iframe.id = 'miew-iframe';
		iframe.src = url;
	});
}

function origin (url) {
	var loc = url;
	if (!loc.href) {
		loc = document.createElement('a');
		loc.href = url;
	}
	if (loc.origin)
		return loc.origin;
	if (!loc.hostname) // relative url, IE
		loc = document.location;
	return loc.protocol  + '//' + loc.hostname +
		   (!loc.port ? '' : ':' + loc.port);
}

function dialog(server, params) {
	var frameUrl = '__EXTERNAL_VIEW__';
	var dlg = ui.showDialog('external_view');
	var loadFrame = initFrame(dlg.select('iframe')[0], frameUrl);
	var loadCML = server.cml({moldata: molfile.stringify(params.struct)});
	var handlers = [];
	var res = null;

	$('loading').style.display = '';
	dlg.addClassName('loading');

	function postFrame(frameWin, message, options) {
		if (options) {
			message += ':' + (typeof options != 'object' ? btoa(options) :
			                  queryString.stringify(options));
		}
		return frameWin.postMessage(message, origin(frameUrl));
	}

	Promise.all([loadFrame, loadCML]).then(function (args) {
		//utils.loading('hide');
		$('loading').style.display = 'none';
		dlg.removeClassName('loading');

		var frameWin = args[0];
		var cml = args[1];

		frameWin.postMessage('setOptions:' + 'load=&theme=light&preset=small&mode=LN&color=AT&select=all&atomLabel=bright&inversePanning=true', origin(frameUrl));
		// postFrame(frameWin, 'setOptions', {
		// 	load: '',
		// 	theme: 'light',
		// 	preset: 'small',
		// 	mode: 'LN',
		// 	color: 'AT',
		// 	select: 'all',
		// 	atomLabel: 'bright',
		// 	inversePanning: true
		// });

		postFrame(frameWin, 'load:CML', cml);

		window.addEventListener('message', function (event) {
			if (event.origin == origin(frameUrl) && event.data.startsWith('CML:')) {
				res = atob(event.data.slice(4));
			}
		});
	}, function (err) {
		$('loading').style.display = 'none';
		dlg.removeClassName('loading');
		ui.echo(err);
	});

	handlers[0] = dlg.on('click', 'input[type=button]', function (_, button) {
		handlers.forEach(function (h) { h.stop(); });
		ui.hideDialog('external_view');
		dlg.select('iframe')[0].src = 'about:blank';
		if (params.onOk) {
			if (!res)
				params.onOk({});
			else {
				var req = server.molfile({moldata: res});
				req.then(function (mol) {
					params.onOk({struct: molfile.parse(mol)});
				});
			}
		}
	});

}

module.exports = dialog;