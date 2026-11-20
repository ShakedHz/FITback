using Toybox.Lang;
using Toybox.WatchUi;

/** Today's classes: time as the label, class name underneath. */
class ClassListMenu extends WatchUi.Menu2 {

  function initialize() {
    var day = DataStore.dayLabel();
    Menu2.initialize({ :title => day == null ? WatchUi.loadResource(Rez.Strings.AppName) : day });

    var classes = DataStore.classes();
    if (classes.size() == 0) {
      addItem(
        new WatchUi.MenuItem(
          WatchUi.loadResource(Rez.Strings.EmptyTitle),
          WatchUi.loadResource(Rez.Strings.EmptyHint),
          :refresh,
          null
        )
      );
      return;
    }

    for (var i = 0; i < classes.size(); i++) {
      var c = classes[i];
      addItem(new WatchUi.MenuItem(Plan.timeRange(c), Plan.title(c), i, null));
    }

    addItem(
      new WatchUi.MenuItem(WatchUi.loadResource(Rez.Strings.Refresh), null, :refresh, null)
    );
  }
}

class ClassListDelegate extends WatchUi.Menu2InputDelegate {

  function initialize() {
    Menu2InputDelegate.initialize();
  }

  function onSelect(item) {
    var id = item.getId();
    if (id == :refresh) {
      DataStore.requestSync();
      return;
    }

    var classes = DataStore.classes();
    if (!(id instanceof Lang.Number) || id >= classes.size()) {
      return;
    }
    var c = classes[id];
    var menu = new SectionMenu(c);
    WatchUi.pushView(menu, new SectionDelegate(c), WatchUi.SLIDE_LEFT);
  }
}
