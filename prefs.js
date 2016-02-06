const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Self = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Self.imports.convenience;

const GObject = imports.gi.GObject;

// Import config
const config = Self.imports.config;

const COLUMN_ID          = 0;
const COLUMN_DESCRIPTION = 1;
const COLUMN_KEY         = 2;
const COLUMN_MODS        = 3;

let settings;

function init() {
    this.settings = Convenience.getSettings();
}

function buildPrefsWidget() {
    let vbox = new Gtk.Box({
        orientation : Gtk.Orientation.VERTICAL,
        margin : 10,
        margin_top : 15,
        spacing : 10
    });

    let treeView = createKeybindingWidget();
    addKeybinding(treeView.model, settings, config.SETTINGS_TOGGLE_SHORTCUT,
        "Toggle visibility of legacy tray");

    let scrolled = new Gtk.ScrolledWindow();
    scrolled.vexpand = true;
    scrolled.add(treeView);
    scrolled.show_all();

    let label = "Use toggle short key?";
    let tooltip = "Do you want to use toggle short key?";

    addToggleWidget(vbox, label, tooltip, config.SETTINGS_USE_TOGGLE_SHORTCUT);
    vbox.add(scrolled);

    vbox.show_all();
    return vbox;
}

function createKeybindingWidget() {
    let model = new Gtk.ListStore();

    model.set_column_types(
            [GObject.TYPE_STRING, // COLUMN_ID
             GObject.TYPE_STRING, // COLUMN_DESCRIPTION
             GObject.TYPE_INT,    // COLUMN_KEY
             GObject.TYPE_INT]);  // COLUMN_MODS

    let treeView = new Gtk.TreeView();
    treeView.model = model;
    treeView.headers_visible = false;
    treeView.expand = true;

    let column, renderer;

    // Description column.
    renderer = new Gtk.CellRendererText();

    column = new Gtk.TreeViewColumn();
    column.expand = true;
    column.pack_start(renderer, true);
    column.add_attribute(renderer, "text", COLUMN_DESCRIPTION);

    treeView.append_column(column);

    // Key binding column.
    renderer = new Gtk.CellRendererAccel();
    renderer.accel_mode = Gtk.CellRendererAccelMode.GTK;
    renderer.editable = true;

    renderer.connect("accel-edited",
            function (renderer, path, key, mods, hwCode) {
                let [ok, iter] = model.get_iter_from_string(path);
                if(!ok)
                    return;

                // Update the UI.
                model.set(iter, [COLUMN_KEY, COLUMN_MODS], [key, mods]);

                // Update the stored setting.
                let id = model.get_value(iter, COLUMN_ID);
                let accelString = Gtk.accelerator_name(key, mods);
                settings.set_strv(id, [accelString]);
            });

    renderer.connect("accel-cleared",
            function (renderer, path) {
                let [ok, iter] = model.get_iter_from_string(path);
                if(!ok)
                    return;

                // Update the UI.
                model.set(iter, [COLUMN_KEY, COLUMN_MODS], [0, 0]);

                // Update the stored setting.
                let id = model.get_value(iter, COLUMN_ID);
                settings.set_strv(id, []);
            });

    column = new Gtk.TreeViewColumn();
    column.pack_end(renderer, false);
    column.add_attribute(renderer, "accel-key", COLUMN_KEY);
    column.add_attribute(renderer, "accel-mods", COLUMN_MODS);

    treeView.append_column(column);

    return treeView;
}

function addToggleWidget(vbox, label, tooltip, conf) {
    let hbox = new Gtk.Box({
        orientation : Gtk.Orientation.HORIZONTAL
    });

    let settingLabel = new Gtk.Label({
        label : label,
        xalign : 0
    });

    let settingSwitch = new Gtk.Switch();
    settings.bind(conf, settingSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
    settingLabel.set_tooltip_text(tooltip);
    settingSwitch.set_tooltip_text(tooltip);

    hbox.pack_start(settingLabel, true, true, 0);
    hbox.add(settingSwitch);

    vbox.add(hbox);
}

function addKeybinding(model, settings, id, description) {
    // Get the current accelerator.
    let accelerator = settings.get_strv(id)[0];
    let key, mods;
    if (accelerator == null)
        [key, mods] = [0, 0];
    else
        [key, mods] = Gtk.accelerator_parse(settings.get_strv(id)[0]);

    // Add a row for the keybinding.
    let row = model.insert(100); // Erm...
    model.set(row,
            [COLUMN_ID, COLUMN_DESCRIPTION, COLUMN_KEY, COLUMN_MODS],
            [id,        description,        key,        mods]);
}
