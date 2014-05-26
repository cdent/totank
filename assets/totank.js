(function(){                                                                    

var app = angular.module('app', []),
	tankServer = 'https://tank.peermore.com';

app.service('spaceInfo', function() {
	var status = window.tiddlyweb.status;
	this.get = function() {
		return {
			'name': status.space.name,
			'private': status.space.name + '_private',
			'public': status.space.name + '_public',
		};
	};
});

app.service('spaceTiddlers', function($http, $q) {
	this.getTiddlers = function(spaceName) {
		var publicTiddlers = $http.get('/bags/'
				+ encodeURIComponent(spaceName) + '_public/tiddlers.json'),
			privateTiddlers = $http.get('/bags/'
				+ encodeURIComponent(spaceName) + '_private/tiddlers.json');
		return $q.all([publicTiddlers, privateTiddlers]);
	};

	this.get = function(tiddler) {
		var uri = tiddler.uri.replace(/.*(\/bags.*$)/, '$1');
		console.log('getting', uri);
		return $http.get(uri, {headers: {'Accept': 'application/json'}});
	};
});

app.service('tankTiddlers', function($http) {
	this.put = function(tankName, tankKey, tiddler) {
		var uri = tankServer + '/bags/' + encodeURIComponent(tankName)
			+ '/tiddlers/' + encodeURIComponent(tiddler.title);
		if (!tiddler.type || tiddler.type == 'None') {
			tiddler.type = 'text/x-tiddlywiki';
		}
		return $http.put(uri, tiddler, {
			headers: {
				'Content-Type': 'application/json',
			    'X-Tank-Key': tankKey
			}
		});
	};
});

app.controller('migrater', function($scope, spaceInfo, spaceTiddlers,
			tankTiddlers) {
	var info = spaceInfo.get();

	$scope.isEnabled = false;
	$scope.publicStarted = false;
	$scope.privateStarted = false;
	$scope.privateTiddlerCount = 0;
	$scope.publicTiddlerCount = 0;
	$scope.putPublicTiddlerCount = 0;
	$scope.putPrivateTiddlerCount = 0;
	$scope.migratePublic = true;
	$scope.migratePrivate = true;
	$scope.public = info.name;
	$scope.private = info.name;

	$scope.migrateTiddlers = function() {
		if ($scope.migratePublic) {
			$scope.publicStarted = true;
			$scope.publicTiddlers.forEach(function(tiddler) {
				spaceTiddlers.get(tiddler).success(
					function(data) {
						console.log('data', data.title, data.uri);
						tankTiddlers.put($scope.public, $scope.key, data)
							.success(function() {
								$scope.putPublicTiddlerCount++;
								if ($scope.putPublicTiddlerCount >=
									$scope.publicTiddlerCount) {
										$scope.publicStarted = false;
								}
							});
					}
				);
			});
		}
		if ($scope.migratePrivate) {
			$scope.privateStarted = true;
			$scope.privateTiddlers.forEach(function(tiddler) {
				spaceTiddlers.get(tiddler).success(
					function(data) {
						tankTiddlers.put($scope.private, $scope.key, data)
							.success(function() {
								$scope.putPrivateTiddlerCount++;
								if ($scope.putPrivateTiddlerCount >=
									$scope.privateTiddlerCount) {
										$scope.privateStarted = false;
								}
							});
					}
				);
			});
		}
		$scope.$apply();
	};

	spaceTiddlers.getTiddlers(info.name).then(function(promises) {
		var public = promises[0],
			private = promises[1];
		$scope.publicTiddlerCount = public.data.length;
		$scope.publicTiddlers = public.data;
		$scope.privateTiddlerCount = private.data.length;
		$scope.privateTiddlers = private.data;
		$scope.isEnabled = true;
	});

});

})();                                                                           


