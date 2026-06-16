# HARDWARE.md — Elektroniczna Tablica Szermierki (Fance)

## Spis treści
1. [Lista komponentów](#lista-komponentów)
2. [Schemat połączeń](#schemat-połączeń)
3. [Przyciski LED](#przyciski-led)
4. [Ekran OLED](#ekran-oled)
5. [Buzzer](#buzzer)
6. [Zasilanie](#zasilanie)

---

## Lista komponentów

| Komponent | Ilość | Opis |
|-----------|-------|------|
| ESP32-C1-Zero | 1 | Główny mikrokontroler z WiFi/BT |
| Przyciski z LED (12V lub 5V) | 8 | Punkty na tablicy |
| Przyciski taktowe 12mm | 5 | Tryb, czas+, czas-, start/stop, reset |
| Ekran OLED SSD1306 128x64 I2C | 1 | Wyświetlanie wyników |
| Buzzer aktywny 5V | 1 | Sygnały dźwiękowe |
| Rezystory 220Ω | 8 | Ograniczenie prądu LED |
| Płytka prototypowa / PCB | 1 | Montaż obwodu |
| Zasilacz 5V 2A | 1 | Zasilanie sieciowe |
| Opcjonalnie: powerbank | 1 | Zasilanie bateryjne |
| Przewody połączeniowe | ≈30 | Połączenia |
| Obudowa | 1 | Plastikowa lub drewniana tablica |

### ESP32-C1-Zero — specyfikacja
- CPU: RISC-V single-core 160 MHz
- Flash: 4 MB
- WiFi: 802.11 b/g/n (2.4 GHz)
- GPIO: 11 pinów cyfrowych
- Zasilanie: 3.3V / 5V (przez USB)
- Wymiary: ~22×18 mm

> ⚠️ ESP32-C1-Zero ma ograniczoną liczbę pinów GPIO (~11).
> Przy 8 przyciskach LED + kontrolki + OLED + buzzer możesz potrzebować
> ekspandera I/O (np. MCP23017, PCF8574) lub przełączyć na ESP32-S3 / ESP32.

---

## Schemat połączeń

```
ESP32-C1-Zero
├── GPIO 2  ──[220Ω]──> LED1 ──> GND    Przycisk 1 (wejście)
├── GPIO 3  ──[220Ω]──> LED2 ──> GND    Przycisk 2
├── GPIO 4  ──[220Ω]──> LED3 ──> GND    Przycisk 3
├── GPIO 5  ──[220Ω]──> LED4 ──> GND    Przycisk 4
├── GPIO 6  ──[220Ω]──> LED5 ──> GND    Przycisk 5
├── GPIO 7  ──[220Ω]──> LED6 ──> GND    Przycisk 6
├── GPIO 8  ──[220Ω]──> LED7 ──> GND    Przycisk 7
├── GPIO 9  ──[220Ω]──> LED8 ──> GND    Przycisk 8
│
├── GPIO 10 <── BTN_MODE (z PULLUP do 3.3V)
├── GPIO 11 <── BTN_TIME_UP
├── GPIO 12 <── BTN_TIME_DOWN
├── GPIO 13 <── BTN_START/STOP
├── GPIO 14 <── BTN_RESET
│
├── GPIO 4  ──> SDA (OLED)     I2C
├── GPIO 5  ──> SCL (OLED)
│
├── GPIO 23 ──> Buzzer+ ──> GND
│
├── 3.3V ──> VCC (OLED, przyciski PULLUP)
└── GND  ──> GND (wszystkie komponenty)
```

> 📝 Dostosuj numery pinów w pliku `firmware/config.h`

---

## Przyciski LED

### Typ A: Przyciski z wbudowanym LED (arkadowe)
- Napięcie LED: 5V lub 12V (sprawdź specyfikację)
- Jeśli 5V: możesz zasilać bezpośrednio z GPIO przez rezystor
- Jeśli 12V: potrzebujesz tranzystora NPN lub modułu MOSFET

### Schemat dla przycisku 5V LED:
```
GPIO ──[220Ω]──> (+)LED(−) ──> GND
                   |
                 Przycisk ──> GND (INPUT_PULLUP)
```

### Schemat dla przycisku 12V LED (z tranzystorem NPN):
```
GPIO ──[1kΩ]──> Baza NPN (np. 2N2222)
               Kolektor ──[100Ω]──> LED ──> 12V
               Emiter ──> GND
```

---

## Ekran OLED

Moduł SSD1306 128×64 I2C:

```
OLED    ESP32
VCC  ── 3.3V
GND  ── GND
SDA  ── GPIO 4
SCL  ── GPIO 5
```

Adres I2C: `0x3C` (domyślny) lub `0x3D` (jeśli pin SA0 = HIGH)

Biblioteka Arduino: `Adafruit SSD1306` + `Adafruit GFX Library`

---

## Buzzer

```
ESP32 GPIO 23 ──> Buzzer (+)
GND            ──> Buzzer (−)
```

Użyj buzzera **aktywnego** (ma wbudowany oscylator).
Dla buzzera pasywnego użyj funkcji `tone()`.

---

## Zasilanie

### Opcja 1: Zasilanie sieciowe (stabilne)
```
Zasilacz 5V 2A ──> USB-C ESP32-C1-Zero
```

### Opcja 2: Zasilanie bateryjne (mobilne)
```
Powerbank 5V 2A ──> USB-C ESP32-C1-Zero
```

### Opcja 3: 18650 Li-Ion (dedykowane)
```
2× 18650 (7.4V) ──> Konwerter DC-DC 5V ──> ESP32
```

### Pobór prądu (szacunkowy):
| Komponent | Prąd |
|-----------|------|
| ESP32-C1-Zero | ~80-250 mA |
| 1 LED aktywny | ~20 mA |
| OLED | ~20 mA |
| **RAZEM** | **~160-450 mA** |

Zalecany zasilacz: **5V / 1A minimum**, 2A dla bezpieczeństwa.

---

## PCB / Płytka prototypowa

### Układ tablicy (sugerowany):
```
┌─────────────────────────────────┐
│   ●  ●  ●  ●    ●  ●  ●  ●     │  ← 8 przycisków z LED
│  (1)(2)(3)(4)  (5)(6)(7)(8)     │
│                                 │
│  [TRYB] [CZ+] [CZ-] [START] [RESET] │  ← 5 przycisków kontrolnych
│                                 │
│  ┌────────────────┐             │
│  │   OLED 128x64  │             │  ← Wyświetlacz
│  └────────────────┘             │
│                                 │
│  ESP32-C1-Zero                  │
└─────────────────────────────────┘
```
