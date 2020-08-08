//https://scotch.io/tutorials/single-page-apps-with-angularjs-routing-and-templating

var app = angular.module('myApp', ['ngRoute']);

app.factory('socket', function ($rootScope) {
  var socket = io.connect();
  return {
    on: function (eventName, callback) {
      socket.on(eventName, function () {  
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      })
    }
  };
});



app.directive("fileread", [function () {
    return {
        scope: {
            fileread: "="
        },
        link: function (scope, element, attributes) {
            element.bind("change", function (changeEvent) {
                var reader = new FileReader();
                reader.onload = function (loadEvent) {
                    scope.$apply(function () {
                        scope.fileread = loadEvent.target.result;
                        });
                }
                reader.readAsDataURL(changeEvent.target.files[0]);
            });
        }
    }
}]);

//the following contains "routes" or the web pages injected into the template page
//template defines the template the page is injected into
//controller defines what the rules and data available for the page are
app.config(function($routeProvider, $httpProvider){
    $routeProvider
    
    //route for the landing page
    
    .when('/', {
        templateUrl: 'cart.html',
        controller: 'data_get'
    })
    
    //routes for links    
    .when('/Home', {
        templateUrl: 'index.html', 
        controller: 'data_get'
    })
    
    //routes for links    
    .when('/Cart', {
        templateUrl: 'cart.html', 
        controller: 'data_get'
    })
    
    //Book Sets   
    .when('/List/:id', {
        templateUrl: 'List.html', 
        controller: 'data_get'
    })
    
    //page seen by users when ticket sent
    .when('/messageSent', {
        templateUrl: 'MS.html', 
        controller: 'data_get'
    })
    
    //set default page or 404    
    .otherwise('/');
});

//used for datepicker and date inserting
app.directive('datepickerPopup', function (dateFilter, $parse){
    return {
        restrict: 'EAC',
        require: '?ngModel',
        link: function(scope, element, attr, ngModel,ctrl) {
            ngModel.$parsers.push(function(viewValue){
                return dateFilter(viewValue, 'yyyy-MM-dd');
    });
    }
  }
});

//{Title:var, Data: [{Name:var, img:var}]}

//defines the rules and data available to the web page
//more efficient use of the server
app.controller('data_get', function($scope, $http, socket, $routeParams, $rootScope){
    if ($routeParams.id){
        var route = $routeParams.id;
        $scope.List = route.replace(new RegExp("\\_", "gi"), " ");
        $http.get('/getItems/'+route).success(function(data){$scope.cart = data});
    }
    
    if(!sessionStorage.getItem("cartTotal")){
        $rootScope.cartTotal = 0;
        $scope.cart = [];
        console.log("don't exist");
    } else {
        $rootScope.cartTotal = JSON.parse(sessionStorage.getItem("cartTotal"));
        $scope.cart = JSON.parse(sessionStorage.getItem("cart"));
        console.log("exist");
    }
    
    $scope.e = false;
    
    $scope.add = function() {
        //$rootScope.cartTotal += 1;
        $scope.cart.unshift({title:"New Item", img:"assets/img/aesfsdf.png", edit: true});
        //sessionStorage.setItem("cartTotal", JSON.stringify($rootScope.cartTotal));
        //sessionStorage.setItem("cart", JSON.stringify($scope.cart));
    };
    
    $scope.cart_add = function(item) {
        $rootScope.cartTotal += 1;
        if(sessionStorage.getItem("cart")){
            var curCart = JSON.parse(sessionStorage.getItem("cart"));
        } else {
            var curCart = [];
        }
        console.log(curCart);
        var newCart = curCart.concat(item);
        console.log(newCart);
        
        sessionStorage.setItem("cartTotal", JSON.stringify($rootScope.cartTotal));
        sessionStorage.setItem("cart", JSON.stringify(newCart));
    };
    
    $scope.save = function(item){
        item.type = route;
        var clean = {
            title: item.title,
            img: item.img,
            type: route
        }
        socket.emit('add_item', clean)
    };
    
    $scope.remove = function(index) {
        $rootScope.cartTotal -= 1;
        $scope.cart.splice(index, 1);
        sessionStorage.setItem("cartTotal", JSON.stringify($rootScope.cartTotal));
        sessionStorage.setItem("cart", JSON.stringify($scope.cart));
    };
    
    $scope.clear = function() {
        sessionStorage.clear();
        $rootScope.cartTotal = 0;
        $scope.cart = [];
    }
    
    $scope.check_requests = function() {
        $('#myModal').modal('show');
    }
    
    $scope.send_requests = function() {
        
        socket.emit('send_requests', {Req: $scope.reqer, Cart: sessionStorage.getItem("cart")});
    }
    
    socket.on('new_Item', function(item){
        item.new = "true";
        $scope.cart.unshift(item);
        console.log("Item added: "+JSON.stringify(item));
    });
    
    socket.on('Sent', function(item){
        $('#myModal').modal('hide');
        alert("Request sent!");
    });
    
    $scope.edit = function(togg) {
        if(togg == "a"){
            $scope.e = true;    
        } else {
            $scope.e = false;
        }
        
    }
    
    $scope.update = function(inp) {
        console.log(inp);
        socket.emit('update_item', inp);
    }
    
    $scope.del = function(inp) {
        console.log(inp);
        socket.emit('delete_item', inp);
        $('#del').modal('hide');
    }
    
    $scope.delCheck = function(inp) {
        console.log(inp);
        $('#del').modal('show');
        $scope.xDel = inp;
        //socket.emit('delete_item', inp);
    }
    
})

app.controller('data_cart', function($scope, $http, socket){
    if(!sessionStorage.getItem("cartTotal")){
        $rootScope.cartTotal = 0;
        $scope.cart = [];
        console.log("don't exist");
    } else {
        $rootScope.cartTotal = JSON.parse(sessionStorage.getItem("cartTotal"));
        $scope.cart = JSON.parse(sessionStorage.getItem("cart"));
        console.log("exist");
    }
    
    $scope.add = function() {
        $rootScope.cartTotal += 1;
        $scope.cart.push({title:"New Item", img:"assets/img/aesfsdf.png", complete:false});
        sessionStorage.setItem("cartTotal", JSON.stringify($rootScope.cartTotal));
        sessionStorage.setItem("cart", JSON.stringify($scope.cart));
    };
    
    $scope.remove = function(index) {
        $rootScope.cartTotal -= 1;
        $scope.cart.splice(index, 1);
        sessionStorage.setItem("cartTotal", JSON.stringify($rootScope.cartTotal));
        sessionStorage.setItem("cart", JSON.stringify($scope.cart));
    };
    
    $scope.clear = function() {
        sessionStorage.clear();
        $rootScope.cartTotal = 0;
        $scope.cart = [];
    }
    /*$scope.LoggedIn = "Logout";
    $scope.addTicket = function(ticket){socket.emit('add_ticket', ticket)};
    $scope.redirect = function(){window.location = "/MS.html";};    
    $http.get('/DB/').success(function(data){$scope.data=data; $scope.data.LoggedIn = "Logout";});*/
    
})