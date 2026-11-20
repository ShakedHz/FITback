using Toybox.Application;
using Toybox.Communications;
using Toybox.Lang;
using Toybox.WatchUi;

class FitbackApp extends Application.AppBase {

  function initialize() {
    AppBase.initialize();
  }

  function onStart(state) {
    Communications.registerForPhoneAppMessages(method(:onPhoneMessage));
    DataStore.requestSync();
  }

  function onStop(state) {
  }

  function getInitialView() {
    var menu = new ClassListMenu();
    return [menu, new ClassListDelegate()];
  }

  /**
   * A fresh day from the phone replaces whatever is on screen, so the watch never
   * shows a plan that no longer matches the list.
   */
  function onPhoneMessage(msg) {
    var data = msg.data;
    if (data == null || !(data instanceof Lang.Dictionary)) {
      return;
    }
    if (data["c"] == null) {
      return;
    }
    DataStore.save(data);
    var menu = new ClassListMenu();
    WatchUi.switchToView(menu, new ClassListDelegate(), WatchUi.SLIDE_IMMEDIATE);
  }
}
