#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>

#include <ArduinoJson.h>
#include <LittleFS.h>
#include <ESP32Servo.h>

Servo baseyaw; //initialize a servo object for the baseyaw,
Servo arm1pitch; //the pitch of the first arm link about the base,
Servo arm2pitch; //the pitch of the second arm link if any, about the joint connecting it to the first arm link,
Servo ef; //the servo controlling the gripping and releasing of the end-effector, and
Servo efroll; //the servo controlling the end-effector's roll angle
Servo efpitch; //Controls the end-effector's pitch

//This will store the last positions of each servo
// std::vector lastServoPositions = {};

int sp1 = 13; //baseyaw
int sp2 = 14; //arm1pitch
int sp3 = 26; //arm2pitch
int sp4 = 33; //ef
int sp5 = 18; //efroll
int sp6 = 32; //efpitch

const char* ssid = "Madara";
const char* password = "chibakutensei";

WebServer server(80);

IPAddress local_IP(11, 0, 0, 1);
IPAddress gateway(11, 0, 0, 1);
IPAddress subnet(255, 255, 255, 0);

// Control logic

String currentController = "";
unsigned long controlClaimTime = 0;
const unsigned long controlTimeout = 1000 * 60 * 5; // 5 minutes

typedef struct AccessInfo {
  String token;
  unsigned long grantTime;
  bool granted = false;
} AccessInfo;

AccessInfo currentAccess;

const unsigned long ACCESS_TIMEOUT = 3 * 60 * 1000;

String generateToken(){
  return String(random(100000, 999999)); // Generate a numeric token
}

void handleGetAccess(){
  unsigned long now = millis();

  if (currentAccess.granted && now - currentAccess.grantTime > ACCESS_TIMEOUT){
    currentAccess = AccessInfo();
  }

  if (!currentAccess.granted){
    String token = generateToken();
    currentAccess = {token, now, true};

    StaticJsonDocument<128> doc;
    doc["access_token"] = token;
    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
    Serial.println("Access Granted!");
  } else {
    server.send(403, "application/json", "{\"error\": \"Access granted to someone else\"}");
  }
}

void handleCheckAccess(){
  String body = server.arg("plain");
  StaticJsonDocument<128> doc;
  deserializeJson(doc, body);

  String token = doc["access-token"];
  bool isValid = currentAccess.granted && token == currentAccess.token && (millis() - currentAccess.grantTime < ACCESS_TIMEOUT);

  StaticJsonDocument<64> res;
  res["status"] = isValid ? "authorized" : "denied";
  String out;
  serializeJson(res, out);
  server.send(200,"application/json", out);
}

void evaluateInstruction(int cid, float value);

void serveFile(const String& path) {
  if (LittleFS.exists(path)){
    File file = LittleFS.open(path, "r");
    String contentType = "text/plain";
    
    if (path.endsWith(".html")) contentType = "text/html";
    else if (path.endsWith(".css")) contentType = "text/css";
    else if (path.endsWith(".js")) contentType = "application/javascript";
    else if (path.endsWith(".json")) contentType = "application/json";
    else if (path.endsWith(".png")) contentType = "image/png";
    else if (path.endsWith(".jpg")) contentType = "image/jpeg";

    server.streamFile(file, contentType);
    file.close();
  }
  else{
    server.send(404, "text/plain", "File Not Found");
  }
}
void setupServos(){
    // baseyaw.setPeriodHertz(50); 
    baseyaw.attach(sp1, 500, 2500);
    // arm1pitch.setPeriodHertz(50);   // 
    arm1pitch.attach(sp2, 500, 2500); 
    // arm2pitch.setPeriodHertz(50);    //
    arm2pitch.attach(sp3, 500, 2500);
    // ef.setPeriodHertz(50);//
    ef.attach(sp4, 500, 2500);
    // efroll.setPeriodHertz(50);//
    efroll.attach(sp5, 500, 2500); 
    efpitch.attach(sp6, 500, 2500); 
}
void setup() {
  Serial.begin(115200);
  setupServos();
  // Start filesystem
  if (!LittleFS.begin()) {
    Serial.println("LittleFS Mount Failed");
    return;      
  }

  // Start Access Point
  WiFi.softAPConfig(local_IP, gateway, subnet);
  WiFi.softAP(ssid, password);
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.softAPIP());

  // Serve frontend
  server.on("/", HTTP_GET, [](){
    serveFile("/index.html");
    Serial.println("Page loaded");
  });
  server.on("/script.js", HTTP_GET, [](){
    serveFile("/script.js");
    Serial.println("Page loaded");
  });
  server.on("/style.css", HTTP_GET, [](){
    serveFile("/style.css");
    Serial.println("Page loaded");
  });

  server.on("/get-access", HTTP_POST, handleGetAccess);
  server.on("/check-access", HTTP_POST, handleCheckAccess);

  // Servo control endpoint
  server.on("/update-state", HTTP_POST, []() {

      if (server.hasArg("plain") == false){
        server.send(400, "application/json", "{\"error\":\"No instruction found\"}");
        return;
      }

      String data = server.arg("plain");

      StaticJsonDocument<200> doc;
      DeserializationError error = deserializeJson(doc, data);

      if (error){
        server.send(400, "application/json", "{\"error\": \"Invalid Json\"}");
        return;
      }

      String token = doc["access-token"];
      if (!currentAccess.granted || token != currentAccess.token || millis() - currentAccess.grantTime > ACCESS_TIMEOUT){
        server.send(401, "application/json", "{\"error\":\"Unauthorized\"}");
        return;
      }

      int id = doc["id"];
      int value = doc["value"];
      Serial.println(value);
      evaluateInstruction(id, value);
      Serial.printf("Servo ID: %d, Value: %d\n", id, value);
      server.send(200, "application/json", "{\"status\":\"OK\"}");
    }
  );

  // ESP.restart();
  server.begin();
  Serial.println("Server started");
}

void evaluateInstruction(int cid, float value){
  // IDs 7 and 8 are special. They refer to open and close for the gripper respectively.
  if (cid == 7){
    ef.write(180);
    // delay(1500);
    // currentServo.write(0);
    Serial.println("Grip command received");
    // delay(1000);
    return;
  }
  else if (cid == 8){
    ef.write(0);   // delay(1500);
    // currentServo.write(180);
    Serial.println("Release command received");
    // delay(1000);
    return;
  }
  // here I'm gonna assume that the sliders' values on the frontend vary from -90 to +90 and so we need to translate this range to a ange of 0 - 180
  int degree = value + 90;
  Serial.println("Got here sha");
  if (cid == 2){
    arm1pitch.write(degree);
    return;
  }
  
  else if (cid == 3){
    arm2pitch.write(degree);
    return;
  }
  else if (cid == 4){
    efroll.write(degree);
    return;
  }
  else if (cid == 9){
    baseyaw.write(degree);
    return;
  }
  else if (cid == 6){
    efpitch.write(degree);
    return;
  }

}

void loop() {
  // Nothing needed here
  server.handleClient();
}
