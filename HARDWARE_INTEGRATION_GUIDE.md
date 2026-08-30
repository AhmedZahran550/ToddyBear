# ToddyBear Smart Toy (ESP32) — Hardware Integration & WebSocket Streaming Guide

> **Version**: 2.0.0 (Gemini Multimodal Live API Pipeline)  
> **Last Updated**: August 2026  
> **Target Hardware**: ESP32-S3 (or ESP32 dual-core) with I2S Microphone (INMP441 / ICS-43434) and I2S DAC/Amp (MAX98357A / ES8388)

---

## 1. Overview & Architecture Changes

### What Changed?
The system has migrated from the legacy **HTTP sequential pipeline** (`POST /api/voice/assistant` -> STT -> LLM -> TTS) to a **real-time bidirectional WebSocket streaming pipeline** powered by Google's **Gemini Multimodal Live API**.

```
LEGACY PIPELINE (Deprecated):
[ESP32] ──(HTTP POST WAV)──> [Groq Whisper STT] ──> [LLM] ──> [Cartesia TTS] ──(WAV 200 OK)──> [ESP32]
Latency: 2.0s - 4.0s (Half-duplex, no barge-in)

NEW PIPELINE (Active):
┌──────────────┐                     ┌────────────────────────┐                     ┌────────────────────────┐
│  Smart Toy   │   Raw PCM 16kHz     │   NestJS Backend Proxy │   Bidi WebSocket    │  Gemini Multimodal     │
│  (ESP32-S3)  │ ═════════════════>  │   (/stream/toy Gateway)│ ═════════════════>  │       Live API         │
│              │ <═════════════════  │                        │ <═════════════════  │                        │
└──────────────┘   PCM 24kHz Audio   └────────────────────────┘   Audio/Tool Chunks └────────────────────────┘
Latency: 300ms - 600ms (Full-duplex, native speech interruption, function calling)
```

### Key Advantages for Hardware
- **Ultra-low latency**: Conversation flows naturally like a real phone call.
- **Native Speech Interruption (Barge-In)**: If the child starts talking while the teddy bear is speaking, the server detects speech and sends a `FLUSH_SPEAKER` command to instantly stop playback.
- **Native Function Calling**: Alarms and messages are triggered automatically by the AI during speech without brittle JSON parsing on the device.
- **Zero Client Audio Encoding**: The ESP32 streams raw PCM audio directly from the I2S DMA buffer without needing to construct WAV headers or encode MP3/AAC.

---

## 2. Audio Specifications

| Parameter | Upstream (Toy ➔ Server) | Downstream (Server ➔ Toy) |
| :--- | :--- | :--- |
| **Modality** | Microphone Stream | Speaker / DAC Stream |
| **Format** | Raw Linear PCM, Signed 16-bit, Little-Endian (`pcm_s16le`) | Raw Linear PCM, Signed 16-bit, Little-Endian (`pcm_s16le`) |
| **Channels** | 1 (Mono) | 1 (Mono) |
| **Sample Rate** | **16,000 Hz** (16 kHz) | **24,000 Hz** (24 kHz) |
| **Frame Payload** | WebSocket Binary Frame | WebSocket Binary Frame |
| **Chunk Size** | **512 – 1024 bytes** (~32ms – 64ms per chunk) | Streamed as received (variable chunk size) |
| **Byte Rate** | 32,000 bytes/sec | 48,000 bytes/sec |

> ⚠️ **IMPORTANT**: Gemini Live outputs audio at **24,000 Hz (24kHz)**. Configure your ESP32 I2S speaker DMA channel to **24kHz, 16-bit Mono**, or resample downstream if your DAC requires 16kHz.

---

## 3. The Complete Hardware Lifecycle

```
 ┌─────────┐                                 ┌──────────────┐                 ┌─────────────┐
 │  ESP32  │                                 │ NestJS Server│                 │ Gemini Live │
 └────┬────┘                                 └──────┬───────┘                 └──────┬──────┘
      │                                             │                                │
      │ 1. HTTP POST /api/auth/device/login         │                                │
      │ ───────────────────────────────────────────>│                                │
      │    { "macAddress": "AA:BB:CC:DD:EE:FF" }    │                                │
      │ <───────────────────────────────────────────│                                │
      │    { "accessToken": "eyJhbGciOi..." }       │                                │
      │                                             │                                │
      │ 2. WS Connect: /stream/toy?token=<JWT>      │                                │
      │ ═══════════════════════════════════════════>│                                │
      │                                             │ ── Connect & Handshake Setup ─>│
      │                                             │ <── { "setupComplete": {} } ───│
      │ 3. JSON Text: {"cmd":"SESSION_READY"}       │                                │
      │ <═══════════════════════════════════════════│                                │
      │                                             │                                │
      │ 4. STREAMING AUDIO (Mic -> Server)          │                                │
      │ ──[Binary: 1024B PCM 16kHz Chunk]──────────>│ ──[realtimeInput.audio]───────>│
      │ ──[Binary: 1024B PCM 16kHz Chunk]──────────>│ ──[realtimeInput.audio]───────>│
      │ ──[Binary: 1024B PCM 16kHz Chunk]──────────>│ ──[realtimeInput.audio]───────>│
      │                                             │                                │
      │ 5. RECEIVING AUDIO (Server -> Speaker)      │                                │
      │ <──[Binary: PCM 24kHz Audio Stream]═════════│ <──[serverContent.modelTurn]───│
      │    (Write directly to I2S Speaker DMA)      │                                │
      │                                             │                                │
      │ 6. BARGE-IN / INTERRUPTION (If child talks) │                                │
      │ ──[Binary: User talking while playing]─────>│ ──[serverContent.interrupted]──│
      │ <══ JSON Text: {"cmd":"FLUSH_SPEAKER"} ═════│                                │
      │    (Clear ESP32 I2S DMA buffer immediately) │                                │
      │                                             │                                │
      │ 7. TURN COMPLETE                            │                                │
      │ <══ JSON Text: {"cmd":"TURN_COMPLETE"} ═════│ <──[serverContent.turnComplete]│
      │                                             │                                │
      │ 8. FUNCTION CALL (e.g. Set Alarm)           │                                │
      │                                             │ <──[toolCall: setAlarm]────────│
      │                                             │ ──[toolResponse: success]─────>│
      │ <──[Binary: "I set your alarm for 7:30!"]═══│ <──[Audio confirmation]────────│
      │                                             │                                │
      │ 9. CLOSING / SLEEP                          │                                │
      │ ══ WebSocket Close (Code: 1000) ═══════════>│ ── Batch Save Transcript ────> │
      └─────────────────────────────────────────────┴────────────────────────────────┘
```

---

## 4. Step-by-Step Implementation Details

### Step 1: Device Authentication (HTTP)
Before establishing the WebSocket, the device must obtain a JWT token using its hardware MAC address.

- **Method**: `POST`
- **URL**: `http://<SERVER_IP>:<PORT>/api/auth/device/login`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "macAddress": "AA:BB:CC:DD:EE:FF"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "device": {
      "id": "c74fcc86-ba64-43ae-872f-827f9b510d83",
      "macAddress": "AA:BB:CC:DD:EE:FF",
      "name": "Teddy Bear"
    },
    "user": {
      "id": "2d57e38b-2a1c-4230-b698-bfcd5c8d6b93",
      "firstName": "Ahmed",
      "preferredName": "Modi",
      "age": 6,
      "gender": "boy"
    }
  }
  ```

---

### Step 2: Open WebSocket Connection
Connect the WebSocket client using the `accessToken` passed in the URL query string:

- **Protocol**: `ws://` (or `wss://` in production with SSL/TLS)
- **Endpoint**: `/stream/toy`
- **Full URL**:
  ```
  ws://<SERVER_IP>:<PORT>/stream/toy?token=<YOUR_ACCESS_TOKEN>
  ```

---

### Step 3: Wait for `SESSION_READY` Handshake
Once connected, the server initializes the Gemini Live session. **Do not stream microphone audio until you receive the `SESSION_READY` message.**

- **Server Message**:
  ```json
  {
    "cmd": "SESSION_READY",
    "sessionId": "23ff6440-0be2-4e82-9956-c77968ad13ed"
  }
  ```
- **Action**: Once received, start your I2S microphone sampling task and begin sending binary audio chunks.

---

### Step 4: Streaming Microphone Audio (Toy ➔ Server)
Read raw PCM audio from your I2S microphone DMA buffer and send it over WebSocket as **Binary Frames**.

- **Format**: Raw PCM, 16kHz, 16-bit signed, Mono, Little-Endian
- **Frame Type**: `WebSocket Binary Frame`
- **Chunk Size**: `512` to `1024` bytes (1024 bytes = 512 samples = **32 ms** of audio)
- **Send Interval**: Continuous stream (every ~32ms)

---

### Step 5: Receiving & Playing Speaker Audio (Server ➔ Toy)
The server streams the AI's spoken reply back to the device as **Binary Frames**.

- **Format**: Raw PCM, **24,000 Hz**, 16-bit signed, Mono, Little-Endian
- **Frame Type**: `WebSocket Binary Frame`
- **Action**: Feed the incoming binary payload directly into the I2S speaker DMA ring buffer.

---

### Step 6: Handling Barge-In / Speech Interruption (`FLUSH_SPEAKER`)
If the child starts speaking while the speaker is playing audio, Gemini's server-side Voice Activity Detection (VAD) detects the interruption. The backend sends a `FLUSH_SPEAKER` command.

- **Server Message**:
  ```json
  {
    "cmd": "FLUSH_SPEAKER"
  }
  ```
- **Mandatory Hardware Action**:
  1. Immediately stop writing audio to the I2S DAC.
  2. Clear / zero-out your local audio ring buffer and call `i2s_zero_dma_buffer()`.
  3. Resume listening for new speech.

---

### Step 7: Turn Completion (`TURN_COMPLETE`)
When Gemini finishes speaking its complete turn, the server sends:

- **Server Message**:
  ```json
  {
    "cmd": "TURN_COMPLETE"
  }
  ```
- **Action**: Indicates the assistant has finished its reply. The device remains connected and keeps streaming mic audio for the next conversational turn.

---

### Step 8: Function Calling (Alarms, Messaging)
The AI automatically detects when the child asks to set an alarm or send a message. The server executes the function and the AI speaks a natural voice confirmation back to the child.

**Available Tools executed server-side:**
1. `setAlarm(time: "HH:MM", label?: string)`
2. `disableAlarm(time: "HH:MM")`
3. `clearAllAlarms()`
4. `sendMessage(recipient: string, content: string)`

*Hardware developer note: No device-side code is needed for function calling. The server handles database operations and returns voice feedback.*

---

### Step 9: Disconnection, Sleep & Inactivity Handling

- **Idle Timeout (`SESSION_TIMEOUT`)**: If no audio or activity occurs for 15 minutes, the server closes the session:
  ```json
  {
    "cmd": "SESSION_TIMEOUT",
    "message": "Session closed due to inactivity"
  }
  ```
- **Error Notification (`SESSION_ERROR`)**:
  ```json
  {
    "cmd": "SESSION_ERROR",
    "message": "..."
  }
  ```
- **Session Ended (`SESSION_ENDED`)**:
  ```json
  {
    "cmd": "SESSION_ENDED",
    "message": "AI session closed"
  }
  ```
- **Graceful Device Disconnect**: When the child presses a physical sleep button or the toy is idle:
  - Close the WebSocket cleanly with code `1000`.
  - The server automatically batch-persists the entire conversation transcript to the `chats` database table upon disconnect.

---

## 5. Summary Protocol Table

| Direction | Frame Type | Content / Payload | Description |
| :--- | :--- | :--- | :--- |
| **Toy ➔ Server** | `Binary` | Raw PCM (16kHz, 16-bit, Mono, 1024B) | Microphone audio stream chunk |
| **Toy ➔ Server** | `Text (JSON)` | `{"event":"user_text","text":"..."}` | Optional text injection |
| **Server ➔ Toy** | `Text (JSON)` | `{"cmd":"SESSION_READY","sessionId":"..."}` | Session ready. Begin mic streaming. |
| **Server ➔ Toy** | `Binary` | Raw PCM (**24kHz**, 16-bit, Mono) | Speaker audio stream chunk |
| **Server ➔ Toy** | `Text (JSON)` | `{"cmd":"FLUSH_SPEAKER"}` | **Barge-In**: Flush I2S speaker DMA buffer immediately. |
| **Server ➔ Toy** | `Text (JSON)` | `{"cmd":"TURN_COMPLETE"}` | Assistant finished speaking turn. |
| **Server ➔ Toy** | `Text (JSON)` | `{"cmd":"SESSION_TIMEOUT","message":"..."}` | Inactivity timeout (15 min). |
| **Server ➔ Toy** | `Text (JSON)` | `{"cmd":"SESSION_ERROR","message":"..."}` | Error on upstream AI connection. |
| **Server ➔ Toy** | `Text (JSON)` | `{"cmd":"SESSION_ENDED","message":"..."}` | Session closed. |

---

## 6. ESP32-S3 Firmware Reference Implementation (C++ / Arduino / FreeRTOS)

Below is a complete, production-ready skeleton for ESP32-S3 using `WebSocketsClient` and ESP-IDF I2S drivers.

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <driver/i2s.h>

// ── Network Configuration ──────────────────────────────
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
const char* SERVER_HOST = "192.168.1.100";  // Backend Server IP
const int   SERVER_PORT = 5000;

// ── Hardware Pinout (ESP32-S3 Example) ─────────────────
#define I2S_MIC_PORT        I2S_NUM_0
#define I2S_MIC_SCK         4   // BCLK
#define I2S_MIC_WS          5   // LRCK
#define I2S_MIC_SD          6   // DOUT from INMP441

#define I2S_SPK_PORT        I2S_NUM_1
#define I2S_SPK_SCK         15  // BCLK
#define I2S_SPK_WS          16  // LRCK
#define I2S_SPK_SD          17  // DIN to MAX98357A

// ── Global Objects ─────────────────────────────────────
WebSocketsClient wsClient;
String jwtToken = "";
bool isSessionReady = false;

#define MIC_CHUNK_SIZE 1024  // 1024 bytes = 512 samples (~32ms at 16kHz)
uint8_t micBuffer[MIC_CHUNK_SIZE];

// ── 1. I2S Initialization ───────────────────────────────

void initI2S() {
  // Microphone: 16kHz, 16-bit, Mono, RX
  i2s_config_t micConfig = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = 16000,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 256,
    .use_apll = false,
  };
  i2s_pin_config_t micPins = {
    .bck_io_num = I2S_MIC_SCK,
    .ws_io_num = I2S_MIC_WS,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num = I2S_MIC_SD
  };
  i2s_driver_install(I2S_MIC_PORT, &micConfig, 0, NULL);
  i2s_set_pin(I2S_MIC_PORT, &micPins);

  // Speaker: 24kHz, 16-bit, Mono, TX (Gemini returns 24kHz)
  i2s_config_t spkConfig = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate = 24000,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 512,
    .use_apll = false,
  };
  i2s_pin_config_t spkPins = {
    .bck_io_num = I2S_SPK_SCK,
    .ws_io_num = I2S_SPK_WS,
    .data_out_num = I2S_SPK_SD,
    .data_in_num = I2S_PIN_NO_CHANGE
  };
  i2s_driver_install(I2S_SPK_PORT, &spkConfig, 0, NULL);
  i2s_set_pin(I2S_SPK_PORT, &spkPins);
}

// ── 2. Device Authentication ───────────────────────────

bool authenticateDevice() {
  HTTPClient http;
  String url = "http://" + String(SERVER_HOST) + ":" + String(SERVER_PORT) + "/api/auth/device/login";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  // Get physical WiFi MAC address
  String mac = WiFi.macAddress();

  StaticJsonDocument<128> doc;
  doc["macAddress"] = mac;
  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);
  if (httpCode == 200 || httpCode == 201) {
    String res = http.getString();
    StaticJsonDocument<1024> resDoc;
    deserializeJson(resDoc, res);
    jwtToken = resDoc["accessToken"].as<String>();
    Serial.println("✅ Authenticated! Token acquired.");
    http.end();
    return true;
  }

  Serial.printf("❌ Authentication failed (HTTP %d): %s\n", httpCode, http.getString().c_str());
  http.end();
  return false;
}

// ── 3. WebSocket Event Handler ─────────────────────────

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.println("🔌 WebSocket Connected to Gateway!");
      break;

    case WStype_DISCONNECTED:
      Serial.println("🔌 WebSocket Disconnected.");
      isSessionReady = false;
      break;

    case WStype_BIN:
      // Binary payload: 24kHz PCM Audio stream from Gemini
      size_t bytesWritten;
      i2s_write(I2S_SPK_PORT, payload, length, &bytesWritten, portMAX_DELAY);
      break;

    case WStype_TEXT: {
      // Text payload: JSON Control Signals
      StaticJsonDocument<256> doc;
      DeserializationError err = deserializeJson(doc, payload, length);
      if (err) return;

      const char* cmd = doc["cmd"];
      if (strcmp(cmd, "SESSION_READY") == 0) {
        Serial.printf("✨ Session Ready! ID: %s\n", doc["sessionId"].as<const char*>());
        isSessionReady = true;
      }
      else if (strcmp(cmd, "FLUSH_SPEAKER") == 0) {
        Serial.println("🛑 Barge-in: Flushing speaker DMA buffer!");
        i2s_zero_dma_buffer(I2S_SPK_PORT);
      }
      else if (strcmp(cmd, "TURN_COMPLETE") == 0) {
        Serial.println("🏁 Gemini turn complete.");
      }
      else if (strcmp(cmd, "SESSION_TIMEOUT") == 0) {
        Serial.println("⏱️ Session timed out due to inactivity.");
        isSessionReady = false;
      }
      break;
    }

    default:
      break;
  }
}

// ── 4. FreeRTOS Task: Microphone Streamer ──────────────

void micStreamTask(void* param) {
  size_t bytesRead = 0;
  while (true) {
    if (isSessionReady && wsClient.isConnected()) {
      // Read 1024 bytes from I2S Microphone
      i2s_read(I2S_MIC_PORT, micBuffer, MIC_CHUNK_SIZE, &bytesRead, portMAX_DELAY);
      if (bytesRead > 0) {
        wsClient.sendBIN(micBuffer, bytesRead);
      }
    } else {
      vTaskDelay(pdMS_TO_TICKS(50));
    }
  }
}

// ── Setup & Loop ───────────────────────────────────────

void setup() {
  Serial.begin(115200);
  delay(1000);

  // 1. Connect WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n📶 WiFi Connected!");

  // 2. Init Audio Hardware
  initI2S();

  // 3. Authenticate with Backend
  if (!authenticateDevice()) {
    Serial.println("Stopping. Check MAC registration.");
    return;
  }

  // 4. Start WebSocket Client
  String wsPath = "/stream/toy?token=" + jwtToken;
  wsClient.begin(SERVER_HOST, SERVER_PORT, wsPath);
  wsClient.onEvent(webSocketEvent);
  wsClient.setReconnectInterval(5000);

  // 5. Create Mic Streamer Task on Core 0 (Audio Thread)
  xTaskCreatePinnedToCore(
    micStreamTask,
    "MicStreamTask",
    4096,
    NULL,
    1,
    NULL,
    0
  );
}

void loop() {
  wsClient.loop();
}
```

---

## 7. Firmware Developer Checklist

- [ ] **I2S Microphone Rate**: Set to `16,000 Hz, 16-bit Mono`.
- [ ] **I2S Speaker DAC Rate**: Set to `24,000 Hz, 16-bit Mono` (matches Gemini audio output).
- [ ] **WebSocket Endpoint**: Use `/stream/toy?token=<JWT>`.
- [ ] **Authentication**: Call `POST /api/auth/device/login` using device MAC address before opening WebSocket.
- [ ] **Wait for `SESSION_READY`**: Do not send microphone frames until `{"cmd":"SESSION_READY"}` is received.
- [ ] **Handle `FLUSH_SPEAKER`**: When received, immediately call `i2s_zero_dma_buffer()` on speaker channel.
- [ ] **Binary Chunks**: Stream microphone data as raw binary frames (512–1024 bytes per frame every ~32ms).
- [ ] **Reconnection**: If disconnected or received `SESSION_TIMEOUT`, re-authenticate and re-open WebSocket when child interacts again.
