import Capacitor
import ConnectIQ
import Foundation

/**
 Bridges the FITback web app to the Connect IQ app on the watch.

 Everything goes over Bluetooth through Garmin Connect Mobile: the phone sends
 today's classes, and the watch can ask for a fresh copy. There is no server.
 */
@objc(GarminBridge)
public class GarminBridge: CAPPlugin, IQDeviceEventDelegate, IQAppMessageDelegate {

    /// Same id as `watch-garmin/manifest.xml`, with dashes.
    private static let watchAppUUID = UUID(uuidString: "7b4c9e2a-3f51-4d68-9c07-2e5a8f1b6d34")!
    private static let urlScheme = "fitback"

    private enum Keys {
        static let uuid = "fitback.garmin.deviceUuid"
        static let model = "fitback.garmin.deviceModel"
        static let name = "fitback.garmin.deviceName"
    }

    private var device: IQDevice?
    private var watchApp: IQApp?
    private var appInstalled = false
    private var pendingSelect: CAPPluginCall?

    // MARK: - Lifecycle

    override public func load() {
        ConnectIQ.sharedInstance().initialize(
            withUrlScheme: Self.urlScheme,
            uiOverrideDelegate: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleOpenURL(_:)),
            name: .capacitorOpenURL,
            object: nil
        )
        restoreSavedDevice()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
        ConnectIQ.sharedInstance().unregister(forAllDeviceEvents: self)
        ConnectIQ.sharedInstance().unregister(forAllAppMessages: self)
    }

    // MARK: - JS API

    /// Opens Garmin Connect Mobile so the user can pick which watch to share.
    @objc func selectDevice(_ call: CAPPluginCall) {
        pendingSelect = call
        call.keepAlive = true
        DispatchQueue.main.async {
            ConnectIQ.sharedInstance().showDeviceSelection()
        }
    }

    @objc func getStatus(_ call: CAPPluginCall) {
        call.resolve(statusPayload())
    }

    /// Forgets the paired watch, so the user can pick a different one.
    @objc func forgetDevice(_ call: CAPPluginCall) {
        if let device = device {
            ConnectIQ.sharedInstance().unregister(forDeviceEvents: device, delegate: self)
        }
        if let watchApp = watchApp {
            ConnectIQ.sharedInstance().unregister(forAppMessages: watchApp, delegate: self)
        }
        device = nil
        watchApp = nil
        appInstalled = false
        let defaults = UserDefaults.standard
        defaults.removeObject(forKey: Keys.uuid)
        defaults.removeObject(forKey: Keys.model)
        defaults.removeObject(forKey: Keys.name)
        call.resolve(statusPayload())
    }

    /// Sends one day of classes to the watch app.
    @objc func syncDay(_ call: CAPPluginCall) {
        guard let watchApp = watchApp else {
            call.reject("no-device")
            return
        }
        guard let payload = call.getObject("payload") else {
            call.reject("missing-payload")
            return
        }

        ConnectIQ.sharedInstance().sendMessage(
            payload,
            to: watchApp,
            progress: nil
        ) { result in
            let name = NSStringFromSendMessageResult(result) ?? "unknown"
            call.resolve(["ok": result == .success, "result": name])
        }
    }

    /// Opens the Connect IQ store page for the watch app (used when it is not installed).
    @objc func openStore(_ call: CAPPluginCall) {
        guard let watchApp = watchApp else {
            call.reject("no-device")
            return
        }
        DispatchQueue.main.async {
            ConnectIQ.sharedInstance().showStore(for: watchApp)
            call.resolve()
        }
    }

    // MARK: - Device selection callback

    @objc private func handleOpenURL(_ notification: Notification) {
        guard
            let payload = notification.object as? [String: Any],
            let url = payload["url"] as? URL,
            url.scheme == Self.urlScheme
        else {
            return
        }

        let devices = ConnectIQ.sharedInstance().parseDeviceSelectionResponse(from: url) as? [IQDevice]
        guard let selected = devices?.first else {
            finishSelect(error: "no-device-selected")
            return
        }

        save(device: selected)
        attach(device: selected)
        refreshAppStatus { [weak self] in
            guard let self = self else { return }
            self.finishSelect(error: nil)
            self.notifyListeners("statusChanged", data: self.statusPayload())
        }
    }

    private func finishSelect(error: String?) {
        guard let call = pendingSelect else { return }
        pendingSelect = nil
        call.keepAlive = false
        if let error = error {
            call.reject(error)
        } else {
            call.resolve(statusPayload())
        }
    }

    // MARK: - Device plumbing

    private func restoreSavedDevice() {
        let defaults = UserDefaults.standard
        guard
            let raw = defaults.string(forKey: Keys.uuid),
            let uuid = UUID(uuidString: raw)
        else {
            return
        }
        guard let restored = IQDevice(
            id: uuid,
            modelName: defaults.string(forKey: Keys.model) ?? "",
            friendlyName: defaults.string(forKey: Keys.name) ?? ""
        ) else {
            return
        }
        attach(device: restored)
        refreshAppStatus(completion: nil)
    }

    private func save(device: IQDevice) {
        let defaults = UserDefaults.standard
        defaults.set(device.uuid.uuidString, forKey: Keys.uuid)
        defaults.set(device.modelName, forKey: Keys.model)
        defaults.set(device.friendlyName, forKey: Keys.name)
    }

    private func attach(device newDevice: IQDevice) {
        if let old = device {
            ConnectIQ.sharedInstance().unregister(forDeviceEvents: old, delegate: self)
        }
        if let oldApp = watchApp {
            ConnectIQ.sharedInstance().unregister(forAppMessages: oldApp, delegate: self)
        }

        device = newDevice
        ConnectIQ.sharedInstance().register(forDeviceEvents: newDevice, delegate: self)

        let app = IQApp(uuid: Self.watchAppUUID, store: UUID(), device: newDevice)
        watchApp = app
        ConnectIQ.sharedInstance().register(forAppMessages: app, delegate: self)
    }

    private func refreshAppStatus(completion: (() -> Void)?) {
        guard let watchApp = watchApp else {
            completion?()
            return
        }
        ConnectIQ.sharedInstance().getAppStatus(watchApp) { [weak self] status in
            self?.appInstalled = status?.isInstalled ?? false
            completion?()
        }
    }

    private func statusPayload() -> [String: Any] {
        var data: [String: Any] = [
            "hasDevice": device != nil,
            "connected": isConnected(),
            "appInstalled": appInstalled
        ]
        if let device = device {
            data["deviceName"] = device.friendlyName
            data["deviceModel"] = device.modelName
        }
        return data
    }

    private func isConnected() -> Bool {
        guard let device = device else { return false }
        return ConnectIQ.sharedInstance().getDeviceStatus(device) == .connected
    }

    // MARK: - IQDeviceEventDelegate

    @objc(deviceStatusChanged:status:)
    public func deviceStatusChanged(_ device: IQDevice!, status: IQDeviceStatus) {
        notifyListeners("statusChanged", data: statusPayload())
        if status == .connected {
            refreshAppStatus { [weak self] in
                guard let self = self else { return }
                self.notifyListeners("statusChanged", data: self.statusPayload())
            }
        }
    }

    // MARK: - IQAppMessageDelegate

    /// The watch asks for today's classes when it opens or when the user taps refresh.
    @objc(receivedMessage:fromApp:)
    public func receivedMessage(_ message: Any!, from app: IQApp!) {
        var command = ""
        if let dict = message as? [String: Any], let cmd = dict["cmd"] as? String {
            command = cmd
        } else if let text = message as? String {
            command = text
        }
        notifyListeners("syncRequested", data: ["cmd": command])
    }
}
