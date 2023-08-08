var updatingFromDevice = [];
var updatingFromScript = [];

var buttonModeContainer;
var buttonModeParams = [];

var buttonContainer;
var buttonPressedParams = [];

var encoderModeContainer;
var encoderModeParams = [];

var encoderContainer;
var encoderValueParams = [];
var encoderPressedParams = [];

var buttonPitches = [89, 90, 40, 41, 42, 43, 44, 45, 87, 88, 91, 92, 86, 93, 94, 95];

function init() {
    buttonModeContainer = local.parameters.getChild("Button Modes");
    encoderModeContainer = local.parameters.getChild("Encoder Modes");

    buttonContainer = local.values.getChild("Buttons");
    encoderContainer = local.values.getChild("Encoders");

    for (var i = 0; i < 16; i++) {
        buttonModeParams[i] = buttonModeContainer.getChild("button" + (i + 1) + "ToggleMode");
        buttonPressedParams[i] = buttonContainer.getChild("button" + (i + 1));
    }

    for (var i = 0; i < 8; i++) {
        encoderModeParams[i] = encoderModeContainer.getChild("encoder" + (i + 1) + "Mode");
        encoderValueParams[i] = encoderContainer.getChild("encoder" + (i + 1) + "");
        encoderPressedParams[i] = encoderContainer.getChild("encoder" + (i + 1) + "Pressed");
    }


    local.sendCC(1, 127, 1); //set MC Mode
}

function moduleParameterChanged(param) {
    if (param.is(local.parameters.isConnected)) {
        if (param.get()) local.sendCC(1, 127, 1);   //set MC Mode
    }

}


function moduleValueChanged(value) {

    if (value.getParent().is(buttonContainer)) {
        var i = getIndexForBT(value);
        local.sendNoteOn(1, buttonPitches[i], value.get() * 127);
    } else if (value.getParent().is(encoderContainer)) {
        var i = getIndexForEncoder(value);
        if(i != -1)
        {
            var encStartValue = encoderModeParams[i].get();
            var targetNum = 48 + i;
            var targetVal = encStartValue + value.get() * 12;
            local.sendCC(1, targetNum, targetVal);
        }
    }
}


function noteOnEvent(channel, pitch, velocity) {
    var bt = getButtonForPitch(pitch);
    if (bt != null) {
        handleButton(bt, true);
        return;
    }


    var encBT = getEncoderPressedForPitch(pitch);
    if (encBT != null) {
        handleEncoderButton(encBT, true);
        return;
    }
}

function noteOffEvent(channel, pitch, velocity) {
    var bt = getButtonForPitch(pitch);
    if (bt != null) {
        handleButton(bt, false);
        return;
    }


    var encBT = getEncoderPressedForPitch(pitch);
    if (encBT != null) {
        handleEncoderButton(encBT, false);
        return;
    }
}


//Upon receiving MIDI Control Change messzge
function ccEvent(channel, number, value) {
    var enc = getEncoderForCC(number);
    if (enc == null) return;

    var incVal = value < 30 ? value : 64 - value;

    var sensitivity = local.parameters.encoderSensitivity.get() * .02;
    var val = enc.get() + incVal * sensitivity;

    var id = encoderValueParams.indexOf(enc) + 1;
    setEncoderValue(id, val);
}

function pitchWheelEvent(channel, value) {
    if (channel == 9) {
        local.values.mainFader.set(value / 16256); //apparently 16256 is highest value, at least on my device
    }
}

//Handlers

function handleButton(bt, isPressed) {
    // script.log("Handle button ", bt, isPressed);
    var isToggle = getButtonToggleModeForPitch(pitch).get();
    var id = buttonPressedParams.indexOf(bt) + 1; //id starts at one

    if (isToggle) {
        if (isPressed) setButtonToggleState(id, !bt.get());
    } else {
        setButtonToggleState(id, isPressed);
    }
}

function handleEncoderButton(bt, isPressed) {
    if (bt == null) return;
    bt.set(isPressed);
}


//Callbacks

function setButtonToggleState(id, value) {
    var bt = buttonPressedParams[id - 1];
    if (bt == null) return;

    if (!updatingFromScript.contains(bt)) updatingFromScript.push(bt);
    bt.set(value);
    updatingFromScript.remove(bt);
}


function setEncoderValue(id, value) {
    var enc = encoderValueParams[id - 1];
    if (enc == null) return;
    if (!updatingFromScript.contains(enc)) updatingFromScript.push(enc);
    enc.set(value);
    updatingFromScript.remove(enc);
}

//Helpers
function getButtonForPitch(pitch) {
    if (buttonPitches.contains(pitch)) return buttonPressedParams[buttonPitches.indexOf(pitch)];
    return null;
}

function getButtonToggleModeForPitch(pitch) {
    if (buttonPitches.contains(pitch)) return buttonModeParams[buttonPitches.indexOf(pitch)];
    return null;
}

function getEncoderForCC(number) {
    if (number >= 16 && number < 24) return encoderValueParams[number - 16];
    return null;
}

function getEncoderPressedForPitch(pitch) {
    if (pitch >= 32 && pitch < 40) return encoderPressedParams[pitch - 32];
    return null;
}

function getIndexForBT(bt) {
    for (var i = 0; i < 16; i++) if (buttonPressedParams[i].is(bt)) return i;
    return -1;
}

function getIndexForEncoder(enc) {
    for (var i = 0; i < 8; i++) if (encoderValueParams[i].is(enc)) return i;
    return -1;
}
