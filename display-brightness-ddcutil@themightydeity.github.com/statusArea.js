const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const { GObject, St, Clutter } = imports.gi;

// icons and labels
const Lang = imports.lang;

// menu items
const Panel = imports.ui.panel;
const PanelMenu = imports.ui.panelMenu
const PopupMenu = imports.ui.popupMenu;
const { Slider, SLIDER_SCROLL_STEP } = imports.ui.slider;

const {
    SHOW_ALL_SLIDER,
    SHOW_VALUE_LABEL,
    brightnessLog
} = Me.imports.convenience;

// for settings
const Convenience = Me.imports.convenience;
settings = ExtensionUtils.getSettings();

const brightnessIcon = 'display-brightness-symbolic';


var StatusAreaBrightnessMenu = GObject.registerClass({
    GType: 'StatusAreaBrightnessMenu',
    Signals: { 'value-up': {}, 'value-down': {} },
}, class StatusAreaBrightnessMenu extends PanelMenu.Button {
    _init() {
        this._valueSliders = [];
        super._init(0.0);
        let icon = new St.Icon({ icon_name: brightnessIcon, style_class: 'system-status-icon' });
        this.add_actor(icon);
        this.connect('scroll-event', (actor, event) => {
            actor.getStoredValueSliders().forEach(valueSlider => {
                valueSlider.emit('scroll-event', event);
            });
            return Clutter.EVENT_STOP;
        });
        this.connect('value-up', (actor, event) => {
            actor.getStoredValueSliders().forEach(valueSlider => {
                valueSlider.value = Math.min(Math.max(0, valueSlider.value + SLIDER_SCROLL_STEP), valueSlider._maxValue);
            });
            return Clutter.EVENT_STOP;
        });
        this.connect('value-down', (actor, event) => {
            actor.getStoredValueSliders().forEach(valueSlider => {
                valueSlider.value = Math.min(Math.max(0, valueSlider.value - SLIDER_SCROLL_STEP), valueSlider._maxValue);
            });
            return Clutter.EVENT_STOP;
        });
    }
    clearStoredValueSliders(){
        this._valueSliders = [];
    }
    storeValueSliderForEvents(slider){
        this._valueSliders.push(slider);
    }
    getStoredValueSliders(){
        return this._valueSliders;
    }
    removeAllMenu() {
        this.menu.removeAll();
    }
    addMenuItem(item, position = null) {
        this.menu.addMenuItem(item);
    }
});

var SingleMonitorMenuItem = GObject.registerClass({
    GType: 'SingleMonitorMenuItem'
}, class SingleMonitorMenuItem extends PopupMenu.PopupBaseMenuItem {
    _init(slider, label) {
        super._init();
        this.add_child(slider);
        
        if (settings.get_boolean(SHOW_VALUE_LABEL)) {
            this.add_child(label);
        }
    }
});

var SingleMonitorSliderAndValue = class SingleMonitorSliderAndValue extends PopupMenu.PopupMenuSection {
    constructor(displayName, currentValue, onSliderChange) {
        super();
        this._timer = null
        this._displayName = displayName
        this._currentValue = currentValue
        this._onSliderChange = onSliderChange
        this._init();
    }
    _init() {
        this.NameContainer = new PopupMenu.PopupMenuItem(this._displayName, { hover: false, reactive: false, can_focus: false });

        this.ValueSlider = new Slider(this._currentValue);
        this.ValueSlider.connect('notify::value', Lang.bind(this, this._SliderChange));

        this.ValueLabel = new St.Label({ text: this._SliderValueToBrightness(this._currentValue).toString() });

        this.SliderContainer = new SingleMonitorMenuItem(this.ValueSlider, this.ValueLabel);

        // add Slider to it
        this.addMenuItem(this.NameContainer);
        this.addMenuItem(this.SliderContainer);
        this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    }
    changeValue(newValue) {
        this.ValueSlider.value = newValue / 100;
    }
    getValueSlider() {
        return this.ValueSlider;
    }
    _SliderValueToBrightness(sliderValue) {
        return Math.floor(sliderValue * 100);
    }
    _SliderChange() {
        let sliderItem = this
        if (sliderItem.timer) {
            Convenience.clearTimeout(sliderItem.timer);
        }
        let brightness = this._SliderValueToBrightness(sliderItem.ValueSlider.value);
        sliderItem.ValueLabel.text = brightness.toString();
        sliderItem.timer = Convenience.setTimeout(() => {
            sliderItem.timer = null;
            sliderItem._onSliderChange(brightness)
        }, 500)
    }
}
