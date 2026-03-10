// =======================
// LEAFLET MAP
// =======================

var map = L.map('map').setView([51.0447, -114.0719], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution:'&copy; OpenStreetMap contributors'
}).addTo(map);

var marker = L.marker([51.0447,-114.0719]).addTo(map);


// =======================
// MQTT VARIABLES
// =======================

var client;
var connected = false;


// =======================
// START BUTTON
// =======================

document.getElementById("startBtn").onclick = function(){

    if(connected){
        alert("Already connected");
        return;
    }

    var host = document.getElementById("host").value;
    var port = Number(document.getElementById("port").value);

    var clientID = "client_" + Math.random().toString(16).substr(2,8);

    client = new Paho.MQTT.Client(host, Number(port), "/mqtt", clientID);

    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    client.connect({
        onSuccess:onConnect,
        useSSL:true
    });

};


// =======================
// WHEN CONNECTED
// =======================

function onConnect(){

    connected = true;

    alert("Connected to MQTT Broker");

    document.getElementById("host").disabled = true;
    document.getElementById("port").disabled = true;

    var topic = document.getElementById("topic").value;

    if(topic !== ""){
        client.subscribe(topic);
        console.log("Subscribed to: " + topic);
    }

}


// =======================
// CONNECTION LOST
// =======================

function onConnectionLost(responseObject){

    if(responseObject.errorCode !== 0){

        console.log("Connection lost: " + responseObject.errorMessage);

        alert("Connection lost. Reconnecting...");

        client.connect({
            onSuccess:onConnect
        });

    }

}


// =======================
// PUBLISH BUTTON
// =======================

document.getElementById("publishBtn").onclick = function(){

    if(!connected){
        alert("Connect to MQTT first");
        return;
    }

    var topic = document.getElementById("topic").value;
    var messageText = document.getElementById("message").value;

    var message = new Paho.MQTT.Message(messageText);
    message.destinationName = topic;

    client.send(message);

    console.log("Message published: " + messageText);

};


// =======================
// SHARE MY STATUS
// =======================

document.getElementById("shareBtn").onclick = function(){

    if(!connected){
        alert("Connect to MQTT first");
        return;
    }

    navigator.geolocation.getCurrentPosition(function(position){

        var lat = position.coords.latitude;
        var lon = position.coords.longitude;

        var temperature = Math.floor(Math.random()*100) - 40;

        var geojson = {
            "type":"Feature",
            "geometry":{
                "type":"Point",
                "coordinates":[lon,lat]
            },
            "properties":{
                "temperature":temperature
            }
        };

        var topic = document.getElementById("topic").value;

        var message = new Paho.MQTT.Message(JSON.stringify(geojson));
        message.destinationName = topic;

        client.send(message);

        console.log("GeoJSON sent:");
        console.log(geojson);

    });

};


// =======================
// MESSAGE RECEIVED
// =======================

function onMessageArrived(message){

    console.log("Message received:");
    console.log(message.payloadString);

    try{

        var data = JSON.parse(message.payloadString);

        var lon = data.geometry.coordinates[0];
        var lat = data.geometry.coordinates[1];
        var temp = data.properties.temperature;

        var color;

        if(temp < 10){
            color = "blue";
        }
        else if(temp < 30){
            color = "green";
        }
        else{
            color = "red";
        }

        if(marker){
            map.removeLayer(marker);
        }

        marker = L.circleMarker([lat,lon],{
            radius:10,
            color:color,
            fillColor:color,
            fillOpacity:0.8
        }).addTo(map);

        marker.bindPopup("Temperature: " + temp + " °C");

        map.setView([lat,lon],15);

    }
    catch(e){

        console.log("Not a GeoJSON message");

    }

}


// =======================
// END BUTTON
// =======================

document.getElementById("endBtn").onclick = function(){

    if(client && connected){

        client.disconnect();

        connected = false;

        document.getElementById("host").disabled = false;
        document.getElementById("port").disabled = false;

        alert("Disconnected from MQTT");

    }

};