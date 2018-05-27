# coding: utf-8
lib = File.expand_path("../lib", __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require "proxycrawl/version"

Gem::Specification.new do |spec|
  spec.name        = "proxycrawl"
  spec.version     = Proxycrawl::VERSION
  spec.platform    = Gem::Platform::RUBY
  spec.authors     = ["proxycrawl"]
  spec.email       = ["info@proxycrawl.com"]
  spec.summary     = %q{ProxyCrawl API client for web scraping and crawling}
  spec.description = %q{Ruby based client for the ProxyCrawl API that helps developers crawl or scrape thousands of web pages anonymously}
  spec.homepage    = "https://github.com/proxycrawl/proxycrawl-ruby"
  spec.license     = "MIT"

  spec.files         = `git ls-files -z`.split("\x0").reject do |f|
    f.match(%r{^(test|spec|features)/})
  end

  spec.required_ruby_version = '>= 2.0'

  spec.bindir        = "exe"
  spec.executables   = spec.files.grep(%r{^exe/}) { |f| File.basename(f) }
  spec.require_paths = ["lib"]

  spec.add_development_dependency "rspec", "~> 3.2"
  spec.add_development_dependency "webmock", "~> 3.4"
  spec.add_development_dependency "bundler", "~> 1.15"
  spec.add_development_dependency "rake", "~> 10.0"
end
