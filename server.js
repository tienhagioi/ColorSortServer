const { Socket } = require('socket.io');
const io = require('socket.io')(process.env.PORT || 8123, { //8123 is the local port we are binding the demo server to
    pingInterval: 30005,		//An interval how often a ping is sent
    pingTimeout: 5000,		//The time a client has to respont to a ping before it is desired dead
    upgradeTimeout: 3000,		//The time a client has to fullfill the upgrade
    allowUpgrades: true,		//Allows upgrading Long-Polling to websockets. This is strongly recommended for connecting for WebGL builds or other browserbased stuff and true is the default.
    cookie: false,			//We do not need a persistence cookie for the demo - If you are using a load balöance, you might need it.
    serveClient: true,		//This is not required for communication with our asset but we enable it for a web based testing tool. You can leave it enabled for example to connect your webbased service to the same server (this hosts a js file).
    allowEIO3: false,			//This is only for testing purpose. We do make sure, that we do not accidentially work with compat mode.
    cors: {
        origin: "*"				//Allow connection from any referrer (most likely this is what you will want for game clients - for WebGL the domain of your sebsite MIGHT also work)
    }
});
//This funciton is needed to let some time pass by between conversation and closing. This is only for demo purpose.
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
// App Code starts here


console.log('Starting Socket.IO demo server');
var allClients = [];
var Clients = {};
var RoomsDict = {};
io.on('connection', (socket) => {
    socket.emit(EventName.OnClientConnected);

    socket.on(EventName.OnClientLogin, async (data) => {
        
        console.log("Nhận được payload OnClientLogin có data " + data);
        if (Clients.hasOwnProperty(socket)) {
            socket.emit(EventName.OnClientLogin, "0");
        } else {
            var userID = data.userID;
            console.log("User ID la " + userID);

            var client = new Client(socket, userID);
            console.log("tạo Client , user id là " + client.userID);
            Clients[socket] = client;
            allClients = Object.values(Clients);
            socket.emit(EventName.OnClientLogin, "1");
            console.log("Thêm client thành công , số client đang online là " + allClients.length);
        }

        
        

    });

    socket.on(EventName.FindOpponent, async (data) => {
        FindOpponent(Clients[socket], data);
    });




    socket.on(EventName.OnClientDisconnected, (data) => {
        delete Clients[socket];
        allClients = Object.values(Clients);
        console.log("Goodbye client +  , số client còn lại là : " + allClients.length);
    });

});






StartBattle = function (_Room) {
    var _data = {        
        "room": {
            "id": _room.id,
            "name": _room.name,
            "clients": clientsID,
            "key": _room.clientKey.userID,
        },
    }
    SendToAllClientInRoom(_Room, EventName.StartBattle, data);
}

FindOpponent = function (_client, data) {
    var roomLevel = data.roomLevel;

    if (RoomsDict.hasOwnProperty(roomLevel)) {
        // duyệt các room xem có room nào đang trống không thì vào còn không thì tạo room 
        var allRoomInLevel = RoomsDict[roomLevel];
        var _listRoomNotFull = allRoomInLevel.filter(_room => _room.clients.length < _room.maxUser);
        if (_listRoomNotFull.length > 0) {
            // nếu có room trống
            var _room = _listRoomNotFull[0];
            _room.clients.push(_client);
            _client.room = _room;
            if (_room.clients.length == _room.maxUser) {
                // phòng đầy thì bắt đầu trận đấu
                StartBattle(_room);
            } else {
                // phòng chưa đầy thì gửi đến các clients là có người đăng nhập vào 
                var data = CreateJoinRoomData(_client, _room);
                SendToAllClientInRoom(_room, EventName.JoinRoom, data);
            }
        } else {
            // nếu không có room nào trống thì tạo phòng
            var _room = CreateRoom("0", "RoomLevel1", _client, 2);
            RoomsDict[roomLevel].push(_room);
            var data = CreateJoinRoomData(_client, _room);
            SendToClient(_client, EventName.JoinRoom, JSON.stringify(_client));
        }

    } else {
        // nếu chưa có list room có mức level này thì thêm vào
        var _room = CreateRoom("0", "RoomLevel1", _client, 2);
        RoomsDict[roomLevel] = [];
        RoomsDict[roomLevel].push(_room);
        
        var data = CreateJoinRoomData(_client, _room);
        SendToClient(_client, EventName.JoinRoom, data);
    }
}

CreateJoinRoomData = function (_clientJoin, _room) {
    var clientsID = [];
    _room.clients.forEach(_client => {
        clientsID.push(_client.userID);
    })
    var _data = {        
        "clientJoin": _clientJoin.userID.toString(),   
        "room": {
            "id": _room.id,
            "name": _room.name,
            "clients": clientsID,
            "key": _room.clientKey.userID,
        },
    }
    return _data;
}

SendToAllClients = function (_eventName, _data) {

    allClients.forEach(_client => {
        _client.socket.emit(_eventName, _data);
    });
}

SendToAllClientInRoom = function (_room, _eventName, _data) {
    _room.clients.forEach(_client => {
        SendToClient(_client, _eventName, _data);
    });
}

SendToClient = function (_client, _eventName, _data) {
    _client.socket.emit(_eventName, _data);
}


CreateRoom = function (_id, _name, _socketKey, _maxUser) {
    var room = new Room(_id, _name, _socketKey, _maxUser);
    return room;
}


let Client = class {

    constructor(_socket, _userID) {
        this.socket = _socket;
        this.userID = _userID;
        this.room = {};
    }
}

let Room = class {
    constructor(_id, _name, _clientKey, _maxUser) {
        this.id = _id;
        this.name = _name;
        // list các client có trong phòng
        this.clients = [];
        this.clients.push(_clientKey);
        // số người tối đa có trong phòng
        this.maxUser = _maxUser;
        // người cầm key của phòng
        this.clientKey = _clientKey;
    }
};

const EventName = {
    // event khi client kết nối đến server
    OnClientConnected: "OnClientConnected",
    // event khi client gửi thông tin đăng nhập 
    OnClientLogin: "OnClientLogin",
    // event khi client gửi các action trong game ( tạo phòng , đổ nước... vv)
    OnClientSendAction: "OnClientSendAction",
    // event khi client bị disconnect
    OnClientDisconnected: "disconnect",
    FindOpponent: "FindOpponent",
    LeftRoom: "LeftRoom",
    JoinRoom: "JoinRoom",
    StartBattle: "StartBattle"
}

const ActionName =
{
    FindOpponent: "FindOpponent"

}