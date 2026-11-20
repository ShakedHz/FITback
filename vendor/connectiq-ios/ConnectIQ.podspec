Pod::Spec.new do |s|
  s.name             = 'ConnectIQ'
  s.version          = '1.8.0'
  s.summary          = 'Garmin Connect IQ Companion App SDK for iOS (vendored).'
  s.description      = <<-DESC
    Vendored copy of https://github.com/garmin/connectiq-companion-app-sdk-ios so the
    xcframework is embedded and signed by CocoaPods instead of by hand in Xcode.
  DESC
  s.homepage         = 'https://github.com/garmin/connectiq-companion-app-sdk-ios'
  s.license          = { :type => 'Garmin Connect IQ SDK License' }
  s.author           = 'Garmin'
  s.platform         = :ios, '13.0'
  s.source           = { :path => '.' }
  s.vendored_frameworks = 'ConnectIQ.xcframework'
  s.frameworks       = 'Foundation', 'CoreBluetooth', 'UIKit'
end
