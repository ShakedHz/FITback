#!/usr/bin/env ruby
# Re-applies the native bits that `npx cap add ios` does not know about:
#   - adds ios/App/App/GarminBridge/* to the App target
#   - registers the fitback:// URL scheme and the Garmin query scheme
#   - allows plain http to the Mac's helper APIs on the LAN
#
# Idempotent. Run with `npm run ios:setup` after a fresh `cap add ios`.
require 'xcodeproj'

ROOT = File.expand_path('..', __dir__)
PROJECT = File.join(ROOT, 'ios/App/App.xcodeproj')
BRIDGE_DIR = File.join(ROOT, 'ios/App/App/GarminBridge')
URL_SCHEME = 'fitback'

abort "Missing #{PROJECT}. Run: npx cap add ios" unless File.exist?(PROJECT)

project = Xcodeproj::Project.open(PROJECT)
target = project.targets.find { |t| t.name == 'App' } or abort 'No "App" target'
app_group = project.main_group['App'] or abort 'No "App" group'

group = app_group['GarminBridge'] || app_group.new_group('GarminBridge', 'App/GarminBridge')

sources = Dir[File.join(BRIDGE_DIR, '*.{swift,m}')].sort
abort "No bridge sources in #{BRIDGE_DIR}" if sources.empty?

added = []
sources.each do |path|
  name = File.basename(path)
  ref = group.files.find { |f| f.display_name == name }
  unless ref
    ref = group.new_reference(path)
    added << name
  end
  unless target.source_build_phase.files_references.include?(ref)
    target.source_build_phase.add_file_reference(ref)
    added << "#{name} (compile)"
  end
end

# The .m file declares a category on the Swift class, so ObjC needs the generated header.
target.build_configurations.each do |config|
  config.build_settings['SWIFT_OBJC_INTERFACE_HEADER_NAME'] ||= 'App-Swift.h'
  config.build_settings['DEFINES_MODULE'] = 'YES'
end

project.save
puts added.empty? ? 'Xcode project already wired.' : "Wired into Xcode: #{added.join(', ')}"

# ---------------------------------------------------------------- Info.plist
plist_path = File.join(ROOT, 'ios/App/App/Info.plist')
plist = Xcodeproj::Plist.read_from_path(plist_path)

url_types = plist['CFBundleURLTypes'] ||= []
unless url_types.any? { |t| (t['CFBundleURLSchemes'] || []).include?(URL_SCHEME) }
  url_types << {
    'CFBundleURLName' => 'com.shakedhz.fitback',
    'CFBundleURLSchemes' => [URL_SCHEME]
  }
end

# Needed so the SDK can tell whether Garmin Connect Mobile is installed.
queries = plist['LSApplicationQueriesSchemes'] ||= []
queries << 'gcm-ciq' unless queries.include?('gcm-ciq')

plist['NSBluetoothAlwaysUsageDescription'] ||=
  'FITback talks to your Garmin watch over Bluetooth to send today\'s classes.'

# The Arbox / SMS / WhatsApp helpers run on the Mac over plain http on the local network.
ats = plist['NSAppTransportSecurity'] ||= {}
ats['NSAllowsLocalNetworking'] = true

plist['NSLocalNetworkUsageDescription'] ||=
  'FITback reads your schedule from the helper running on your Mac on this WiFi.'

Xcodeproj::Plist.write_to_path(plist, plist_path)
puts 'Info.plist updated (fitback:// scheme, gcm-ciq query, local networking).'
