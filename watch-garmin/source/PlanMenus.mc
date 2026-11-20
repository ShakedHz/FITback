using Toybox.Lang;
using Toybox.WatchUi;

/** Reading one class out of the payload, with missing fields tolerated. */
module Plan {

  function title(c) {
    var t = c["t"];
    return t == null ? "" : t;
  }

  function timeRange(c) {
    var s = c["s"];
    var e = c["e"];
    if (s == null) {
      return "";
    }
    return e == null ? s : s + "-" + e;
  }

  function sections(c) {
    var list = c["p"];
    if (list == null || !(list instanceof Lang.Array)) {
      return [];
    }
    return list;
  }

  function exercises(section) {
    var list = section["x"];
    if (list == null || !(list instanceof Lang.Array)) {
      return [];
    }
    return list;
  }
}

/** The sections of one class. */
class SectionMenu extends WatchUi.Menu2 {

  function initialize(c) {
    Menu2.initialize({ :title => Plan.title(c) });

    var sections = Plan.sections(c);
    if (sections.size() == 0) {
      addItem(
        new WatchUi.MenuItem(WatchUi.loadResource(Rez.Strings.NoPlan), null, :none, null)
      );
      return;
    }

    for (var i = 0; i < sections.size(); i++) {
      var section = sections[i];
      var count = Plan.exercises(section).size();
      var label = section["t"];
      addItem(
        new WatchUi.MenuItem(
          label == null ? "" : label,
          count.toString() + " " + WatchUi.loadResource(Rez.Strings.ExercisesSuffix),
          i,
          null
        )
      );
    }
  }
}

class SectionDelegate extends WatchUi.Menu2InputDelegate {
  private var _class;

  function initialize(c) {
    Menu2InputDelegate.initialize();
    _class = c;
  }

  function onSelect(item) {
    var id = item.getId();
    var sections = Plan.sections(_class);
    if (!(id instanceof Lang.Number) || id >= sections.size()) {
      return;
    }
    var section = sections[id];
    WatchUi.pushView(new ExerciseMenu(section), new ExerciseDelegate(), WatchUi.SLIDE_LEFT);
  }

  function onBack() {
    WatchUi.popView(WatchUi.SLIDE_RIGHT);
  }
}

/** The exercises of one section, numbered in teaching order. */
class ExerciseMenu extends WatchUi.Menu2 {

  function initialize(section) {
    var label = section["t"];
    Menu2.initialize({ :title => label == null ? "" : label });

    var exercises = Plan.exercises(section);
    for (var i = 0; i < exercises.size(); i++) {
      var name = exercises[i];
      addItem(
        new WatchUi.MenuItem(
          (i + 1).toString() + ". " + (name == null ? "" : name),
          null,
          i,
          null
        )
      );
    }
  }
}

class ExerciseDelegate extends WatchUi.Menu2InputDelegate {

  function initialize() {
    Menu2InputDelegate.initialize();
  }

  function onSelect(item) {
  }

  function onBack() {
    WatchUi.popView(WatchUi.SLIDE_RIGHT);
  }
}
