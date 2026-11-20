using Toybox.Application;
using Toybox.Communications;
using Toybox.Lang;
using Toybox.System;

/**
 * The last day the phone sent, kept in persistent storage so the watch still
 * shows something when the phone is out of range.
 *
 * Payload shape (compact keys, see src/utils/liveClasses.ts buildWatchPayload):
 *   { "v" => 1, "d" => "2026-09-28",
 *     "c" => [ { "s" => "08:00", "e" => "08:50", "t" => title, "l" => location,
 *                "p" => [ { "t" => section, "x" => [ exercise, ... ] } ] } ] }
 */
module DataStore {

  const KEY_DAY = "day";

  function save(payload) {
    try {
      Application.Storage.setValue(KEY_DAY, payload);
    } catch (e) {
      // Storage is small; a payload that does not fit is dropped rather than crashing.
      System.println("FITback: could not store payload");
    }
  }

  function load() {
    var stored = Application.Storage.getValue(KEY_DAY);
    if (stored == null || !(stored instanceof Lang.Dictionary)) {
      return null;
    }
    return stored;
  }

  function classes() {
    var day = load();
    if (day == null) {
      return [];
    }
    var list = day["c"];
    if (list == null || !(list instanceof Lang.Array)) {
      return [];
    }
    return list;
  }

  function dayLabel() {
    var day = load();
    return day == null ? null : day["d"];
  }

  /** Ask the phone for a fresh copy. Silently ignored when the phone app is closed. */
  function requestSync() {
    try {
      Communications.transmit({ "cmd" => "sync" }, null, new SyncListener());
    } catch (e) {
      System.println("FITback: transmit failed");
    }
  }
}

class SyncListener extends Communications.ConnectionListener {
  function initialize() {
    ConnectionListener.initialize();
  }

  function onComplete() {
    System.println("FITback: sync requested");
  }

  function onError() {
    System.println("FITback: sync request failed");
  }
}
