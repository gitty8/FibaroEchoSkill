module.exports.STATE_RESPONSES = {
    NoHelpYet:"Noch gibt es keine Hilfe.",
    DoSomething:"Nenne ein Kommando oder stelle eine Frage.",
    Bye:'Tschüss',
    Welcome:'Willkommen bei der Heimautomatisierung deines Hauses.',
    NoDeviceFound:"Es konnte kein passendes Gerät gefunden werden!",
    SceneNotFound:"Diese Szene wurde nicht gefunden.",
    SceneStarted:"Szene $Szenename wurde gestartet.",
    RoomNotFound:"Raum $Room wurde nicht gefunden.",
    NoShuttersInRoom:"Konnte keine Rollos im Raum $Room finden.",
    Temperature:"Temperatur",
    Degrees:'Grad',
    Luminance:'Helligkeit',
    Lux:'Lux',
    Percent:'Prozent',
    Humidity:'Luftfeuchtigkeit',
    NoSensorFound:'Es konnte kein passender Sensor im Raum $Room gefunden werden!',
    SensorState:'Die $SensorTyp im Raum $Room beträgt $value $Unit. ',
    SensorStateMinMax:'Die $SensorTyp im Raum $Room liegt zwischen $value1 $Unit und $value2 $Unit. Der Durchschnitt beträgt $value3 $Unit. ',
    ThermostatCurrent:'Das Thermostat steht auf $value Grad.',
    SwitchOn:'$Device ist an',
    SwitchOnPower:'$Device ist an und verbraucht aktuell $value Watt.',
    SwitchIsOff:'$Device ist aus.',
    SwitchAskOn:"Wollen Sie es anschalten? Sagen Sie dazu nein, ja oder Schalte $Device an.",
    SwitchAskOff:"Wollen Sie es ausschalten? Sagen Sie dazu nein, ja oder Schalte $Device aus.",
    SwitchedOff:'Gerät wurde ausgeschaltet.',
    SwitchedOn:'Gerät wurde eingeschaltet.',
    NewStateShutters:"Neuer Status für Rollos gesetzt.",
    NewStateShuttersInRoom:"Neuer Status für Rollos im Raum $Room gesetzt.",
    NoNameGiven:"Kein Name angegeben.",
    NoShutterFound:"Es wurde kein Rollo mit dem Namen $Shutter gefunden.",
    NoLightsFound:"Es konnten keine Lampen gefunden werden.",
    NoLightsFoundInRoom:"Es konnten keine Lampen im Raum $Room gefunden werden.",
    NoLightsFoundInRoomAndRoom2:"Es konnten keine Lampen im Raum $Room1 und $Room2 gefunden werden.",
    DimValueIncorrect:"Dimwert ist nicht korrekt.",
    DimLight:"Lampen wurden auf $value Prozent gedimmt.",
    TemperatureSet:'Temperatur vom Thermostat im Raum $Room auf $value Grad gesetzt',
    ForTime:' für $value Stunden',
    LambdaError:'The Lambda service encountered an error: ',
    Warm:'warm kalt wärme kälte temperatur',
    Humid:'feucht feuchtigkeit luftfeuchte luftfeuchtigkeit trocken trockenheit',
    Bright:'hell dunkel helligkeit dunkelheit',
    AllInState:'Es sind alle $Objects $status.',
    NothingInState:'Es sind keine $Objects $status.',
    ObjectsInState:'Es sind folgende $Objects $status: ',
    LightsSwitchedOff:'Lampen wurden ausgeschaltet',
    LightsSwitchedOn:'Lampen wurden angeschaltet',
    On:'an angeschaltet',
    Off:'aus ausgeschaltet',
    All:'alle',
    Up:'hoch,auf,offen,oben,geöffnet,fahre hoch',
    Down:'runter,schließe,fahre runter',
    OpenTyps:'an,auf,hoch,offen,oben,geöffnet',
    LightTyps:'lichter,lampen,leuchten',
    ShutterTyps:'rollos,rollläden',
    Shutter:'Rollo',
    Shutter2:'Rollladen',
    DoorTyps:'tür,türen',
    Door:'Tür',
    Window:'Fenster',
    Doors:'Türen',
    Windows:'FenstREPLACE_TEXTer',
    Lights:'Lichter',
    Shutters:'Rollläden',
    DoorsAndWindows:'Türen und Fenster',
    WindowTyps:'fenster',
    DoorWindowTyps:'fenster türen,türen fenster,fenster und türen,türen und fenster,tür fenster,fenster tür',
    Lamp:'Lampe',
    Light:'Licht',
    Dimmer:'Dimmer',
    NoGlobalVariableFound:'Globale Variable $value wurde nicht gefunden',
    PossibleGlobalValues:'Mögliche Werte sind:',
    GlobalValue:'Der aktuelle Wert der Variable $global ist $value.',
    ChangeGlobalValue:'Wollen Sie den Wert ändern?',
    IllegalValueForGlobalVariable:'Der Wert $value ist für die globale Variable $global nicht gültig!',
    GlobalVariableSet:'Die globale Variabel $global wurde von $oldvalue auf $newvalue gesetzt.',
    ValuesAreIdentical:'Die Werte sind gleich. Ich ändere nichts.',
    VirtualModuleNotFound:'Konnte das virtuelle modul mit dem Namen $name nicht finden.',
    PressedButton:'Button $button im Modul $name wurde gedrückt.',
    ButtonNotFound:'Button $name nicht gefunden.',
    SliderNotFound:'Slider $name nicht gefunden.',
    SetSlider:'Slider $slider im Modul $name auf $value gesetzt.',
    DeviceState:'$name ist $status',
    Open:'auf',
    Close:'zu',
    Yes:'ja',
    No:'nein',
    AllClosed:'Alle $Type sind geschlossen.',
    AllOpen:'Alle $Type sind offen.',
    TemperatureInvalid:'Temperatur konnte nicht erkannt werden oder hat einen nicht gültigen Wert.',
    InvalidValue:'Ein ungültiger Wert wurde erkannt',
    UnknownCommand:'Das Kommando konnte nicht korrekt erkannt werden.',
    NoThermostatFound:'Es konnte leider kein Thermostat im Raum $Room gesetzt werden',
    ErrorInAPI:'Es ist ein Fehler beim Nutzen der API aufgetreten.',
    DeviceInRoom:'$Device in $Room',
    DoorLock:'schloss',
    RemovableWords:'der die das',
    IllegalPercentValue:'Ungültiger Prozentwert',
    DoorOpen:'Das Schloss ist auf.',
    DoorClosed:'Das Schloss ist zu.',
    AskDoorOpen:'Wollen Sie das Schloss $Device öffnen?',
    AskDoorClose:'Wollen Sie das Schloss $Device schließen?',
    PowerUsage:'Der Verbrauch vom Gerät $Device beträgt $value Watt.',
    RGBLight:'Die Farben sind: $red Rot, $green Grün, $blue Blau und $white Weiß.',
    RGBProgram:'Programm Nummer $value wurde gestartet.',
    RGBProgramRunning:'Es läuft Programm Nummer $value',
    RGBValueRedSet:'Wert für Rot wurde gesetzt.',
    RGBValueGreenSet:'Wert für Grün wurde gesetzt.',
    RGBValueBlueSet:'Wert für Blau wurde gesetzt.',
    RGBValueWhiteSet:'Wert für Weiß wurde gesetzt.',
    RGBValueBrightnessSet:'Wert für Helligkeit wurde gesetzt.',
    NoRGBProgramRunning:'Aktuell läuft kein Programm.',
    Colors:'Farben',
    MovementInRoom:'Aktuell gibt es Bewegung in Raum $Room.',
    NoMovementInRoom:'Aktuell gibt es keine Bewegung in Raum $Room.',
    LastMovement:'Die letzte registrierte Bewegung war vor $Time $Unit',
    NoMovementsFound:'Es wurde aktuell keine Bewegung registriert',
    MovementsInRooms:'In den folgenden Räumen wird Bewegung registriert:',
    SECONDS:'Sekunden',
    MINUTES:'Minuten',
    HOURS:'Stunden',
    DAYS:'Tagen',
    AlarmActive:'Alarm ist aktiv.',
    ArmedModules:'Folgende Geräte sind scharf geschaltet:',
    AlarmInactive:'Alarm ist inaktiv. Kein Modul ist scharf geschaltet.',
    SceneOutput:'Ausgabe der Szene ist: $Output',
    NoSceneOutput:'Szene $Name hat keine Ausgabe',
    Ok:'Ok.',
    ParameterMissing:'Parameter fehlt.'
};

module.exports.GLOBAL_TRANSLATE = {
    "blockiere licht aus" : "BlockGlobalLightOff",
    "nachtzeit" : "NightTime",
    "meldung sonos bad" : "SonosMsgBad",
    "meldung sonos küche" : "SonosMsgKitchen",
    "sonos text to speech" : "SonosTTS",
    "sonos text to speech bad" : "SonosTTSBad",
    "telegramm" : "Telegram",
    "alarm status" : "AlarmState",
    "anwesendheitsstatus" : "PresentState"
};

module.exports.REPLACE_TEXT = {WZ:"Wohnzimmer",EZ:"Esszimmer",AZ:"Arbeitszimmer",OG:"Obergeschoss",KiZi2:"Kinderzimmer",KiZi1:"Gästezimmer",EG:"Erdgeschoss", WiGa:"Wintergarten",SZ:"Schlafzimmer"};
