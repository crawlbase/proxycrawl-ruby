# ProxyCrawl

Dependency free gem for scraping and crawling websites using the ProxyCrawl API.

## Installation

Add this line to your application's Gemfile:

```ruby
gem 'proxycrawl'
```

And then execute:

    $ bundle

Or install it yourself as:

    $ gem install proxycrawl

## Crawling API Usage

Require the gem in your project

```ruby
require 'proxycrawl'
```

Initialize the API with one of your account tokens, either normal or javascript token. Then make get or post requests accordingly.

You can get a token for free by [creating a ProxyCrawl account](https://proxycrawl.com/signup) and 1000 free testing requests. You can use them for tcp calls or javascript calls or both.

```ruby
api = ProxyCrawl::API.new(token: 'YOUR_TOKEN')
```

### GET requests

Pass the url that you want to scrape plus any options from the ones available in the [API documentation](https://proxycrawl.com/dashboard/docs).

```ruby
api.get(url, options)
```

Example:

```ruby

begin
  response = api.get('https://www.facebook.com/britneyspears')
  puts response.status_code
  puts response.original_status
  puts response.pc_status
  puts response.body
rescue => exception
  puts exception.backtrace
end

```

You can pass any options of what the ProxyCrawl API supports in exact param format.

Example:

```ruby
options = {
  user_agent: 'Mozilla/5.0 (Windows NT 6.2; rv:20.0) Gecko/20121202 Firefox/30.0',
  format: 'json'
}

response = api.get('https://www.reddit.com/r/pics/comments/5bx4bx/thanks_obama/', options)

puts response.status_code
puts response.body # read the API json response
```

### POST requests

Pass the url that you want to scrape, the data that you want to send which can be either a json or a string, plus any options from the ones available in the [API documentation](https://proxycrawl.com/dashboard/docs).

```ruby
api.post(url, data, options);
```

Example:

```ruby
api.post('https://producthunt.com/search', { text: 'example search' })
```

You can send the data as application/json instead of x-www-form-urlencoded by setting options `post_content_type` as json.

```ruby
response = api.post('https://httpbin.org/post', { some_json: 'with some value' }, { post_content_type: 'json' })

puts response.status_code
puts response.body

```

### Javascript requests

If you need to scrape any website built with Javascript like React, Angular, Vue, etc. You just need to pass your javascript token and use the same calls. Note that only `.get` is available for javascript and not `.post`.

```ruby
api = ProxyCrawl::API.new(token: 'YOUR_JAVASCRIPT_TOKEN' })
```

```ruby
response = api.get('https://www.nfl.com')
puts response.status_code
puts response.body
```

Same way you can pass javascript additional options.

```ruby
response = api.get('https://www.freelancer.com', options: { page_wait: 5000 })
puts response.status_code
```

## Original status

You can always get the original status and proxycrawl status from the response. Read the [ProxyCrawl documentation](https://proxycrawl.com/dashboard/docs) to learn more about those status.

```ruby
response = api.get('https://sfbay.craigslist.org/')

puts response.original_status
puts response.pc_status
```

## Scraper API usage

Initialize the Scraper API using your normal token and call the `get` method.

```ruby
scraper_api = ProxyCrawl::ScraperAPI.new(token: 'YOUR_TOKEN')
```

Pass the url that you want to scrape plus any options from the ones available in the [Scraper API documentation](https://proxycrawl.com/docs/scraper-api/parameters).

```ruby
api.get(url, options)
```

Example:

```ruby
begin
  response = scraper_api.get('https://www.amazon.com/Halo-SleepSack-Swaddle-Triangle-Neutral/dp/B01LAG1TOS')
  puts response.remaining_requests
  puts response.status_code
  puts response.body
rescue => exception
  puts exception.backtrace
end
```

## Leads API usage

Initialize with your Leads API token and call the `get` method.

For more details on the implementation, please visit the [Leads API documentation](https://proxycrawl.com/docs/leads-api).

```ruby
leads_api = ProxyCrawl::LeadsAPI.new(token: 'YOUR_TOKEN')

begin
  response = leads_api.get('stripe.com')
  puts response.success
  puts response.remaining_requests
  puts response.status_code
  puts response.body
rescue => exception
  puts exception.backtrace
end
```

If you have questions or need help using the library, please open an issue or [contact us](https://proxycrawl.com/contact).


## Screenshots API usage

Initialize with your Screenshots API token and call the `get` method.

```ruby
screenshots_api = ProxyCrawl::ScreenshotsAPI.new(token: 'YOUR_TOKEN')

begin
  response = screenshots_api.get('https://www.apple.com')
  puts response.success
  puts response.remaining_requests
  puts response.status_code
  puts response.screenshot_path # do something with screenshot_path here
rescue => exception
  puts exception.backtrace
end
```

or with using a block

```ruby
screenshots_api = ProxyCrawl::ScreenshotsAPI.new(token: 'YOUR_TOKEN')

begin
  response = screenshots_api.get('https://www.apple.com') do |file|
    # do something (reading/writing) with the image file here
  end
  puts response.success
  puts response.remaining_requests
  puts response.status_code
rescue => exception
  puts exception.backtrace
end
```

or specifying a file path

```ruby
screenshots_api = ProxyCrawl::ScreenshotsAPI.new(token: 'YOUR_TOKEN')

begin
  response = screenshots_api.get('https://www.apple.com', save_to_path: '~/screenshot.jpg') do |file|
    # do something (reading/writing) with the image file here
  end
  puts response.success
  puts response.remaining_requests
  puts response.status_code
rescue => exception
  puts exception.backtrace
end
```

Note that `screenshots_api.get(url, options)` method accepts an [options](https://proxycrawl.com/docs/screenshots-api/parameters)

## Storage API usage

Initialize the Storage API using your private token.

```ruby
storage_api = ProxyCrawl::StorageAPI.new(token: 'YOUR_TOKEN')
```

Pass the [url](https://proxycrawl.com/docs/storage-api/parameters/#url) that you want to get from [Proxycrawl Storage](https://proxycrawl.com/dashboard/storage).

```ruby
begin
  response = storage_api.get('https://www.apple.com')
  puts response.original_status
  puts response.pc_status
  puts response.url
  puts response.status_code
  puts response.rid
  puts response.body
  puts response.stored_at
rescue => exception
  puts exception.backtrace
end
```

or you can use the [RID](https://proxycrawl.com/docs/storage-api/parameters/#rid)

```ruby
begin
  response = storage_api.get(RID)
  puts response.original_status
  puts response.pc_status
  puts response.url
  puts response.status_code
  puts response.rid
  puts response.body
  puts response.stored_at
rescue => exception
  puts exception.backtrace
end
```

Note: One of the two RID or URL must be sent. So both are optional but it's mandatory to send one of the two.

### [Delete](https://proxycrawl.com/docs/storage-api/delete/) request

To delete a storage item from your storage area, use the correct RID

```ruby
if storage_api.delete(RID)
  puts 'delete success'
else
  puts "Unable to delete: #{storage_api.body['error']}"
end
```

### [Bulk](https://proxycrawl.com/docs/storage-api/bulk/) request

To do a bulk request with a list of RIDs, please send the list of rids as an array

```ruby
begin
  response = storage_api.bulk([RID1, RID2, RID3, ...])
  puts response.original_status
  puts response.pc_status
  puts response.url
  puts response.status_code
  puts response.rid
  puts response.body
  puts response.stored_at
rescue => exception
  puts exception.backtrace
end
```

### [RIDs](https://proxycrawl.com/docs/storage-api/rids) request

To request a bulk list of RIDs from your storage area

```ruby
begin
  response = storage_api.rids
  puts response.status_code
  puts response.rid
  puts response.body
rescue => exception
  puts exception.backtrace
end
```

You can also specify a limit as a parameter

```ruby
storage_api.rids(100)
```

### [Total Count](https://proxycrawl.com/docs/storage-api/total_count)

To get the total number of documents in your storage area

```ruby
total_count = storage_api.total_count
puts "total_count: #{total_count}"
```

If you have questions or need help using the library, please open an issue or [contact us](https://proxycrawl.com/contact).

## Development

After checking out the repo, run `bin/setup` to install dependencies. You can also run `bin/console` for an interactive prompt that will allow you to experiment.

To install this gem onto your local machine, run `bundle exec rake install`. To release a new version, update the version number in `version.rb`, and then run `bundle exec rake release`, which will create a git tag for the version, push git commits and tags, and push the `.gem` file to [rubygems.org](https://rubygems.org).

## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/proxycrawl/proxycrawl-ruby. This project is intended to be a safe, welcoming space for collaboration, and contributors are expected to adhere to the [Contributor Covenant](http://contributor-covenant.org) code of conduct.

## License

The gem is available as open source under the terms of the [MIT License](http://opensource.org/licenses/MIT).

## Code of Conduct

Everyone interacting in the Proxycrawl project’s codebases, issue trackers, chat rooms and mailing lists is expected to follow the [code of conduct](https://github.com/proxycrawl/proxycrawl-ruby/blob/master/CODE_OF_CONDUCT.md).

---

Copyright 2023 ProxyCrawl
