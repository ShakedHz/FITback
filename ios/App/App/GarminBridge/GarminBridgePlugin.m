#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Registers the Swift GarminBridge class with the Capacitor JS bridge.
CAP_PLUGIN(GarminBridge, "GarminBridge",
           CAP_PLUGIN_METHOD(selectDevice, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(getStatus, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(forgetDevice, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(syncDay, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(openStore, CAPPluginReturnPromise);
)
