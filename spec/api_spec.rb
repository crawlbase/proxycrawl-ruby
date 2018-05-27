require 'spec_helper.rb'
require 'proxycrawl'

describe ProxyCrawl::API do
  it "raises an error if token is missing" do
    expect { ProxyCrawl::API.new }.to raise_error(RuntimeError, 'Token is required')
  end

  it "sets/reads token" do
    expect(ProxyCrawl::API.new(token: 'test').token).to eql('test')
  end

  describe '#get' do
    it 'sends an get request to ProxyCrawl API' do
      stub_request(:get, 'https://api.proxycrawl.com/?token=test&url=http%3A%2F%2Fhttpbin.org%2Fanything%3Fparam1%3Dx%26params2%3Dy').
        to_return(
          body: 'body',
          status: 200,
          headers: { skip_normalize: true, 'original_status' => 200, 'pc_status' => 200, 'url' => 'http://httpbin.org/anything?param1=x&params2=y'})

      api = ProxyCrawl::API.new(token: 'test')

      response = api.get("http://httpbin.org/anything?param1=x&params2=y")

      expect(response.status_code).to eql(200)
      expect(response.original_status).to eql(200)
      expect(response.pc_status).to eql(200)
      expect(response.url).to eql('http://httpbin.org/anything?param1=x&params2=y')
      expect(response.body).to eql('body')
    end
  end

  describe '#post' do
    it 'sends a post request to ProxyCrawl API with json data' do
      stub_request(:post, 'https://api.proxycrawl.com/?post_content_type=json&token=test&url=http://httpbin.org/post').
        with(body: "{\"foo\":\"bar\"}").
        to_return(
          body: 'body',
          status: 200,
          headers: { skip_normalize: true, 'original_status' => 200, 'pc_status' => 200, 'url' => 'http://httpbin.org/anything?param1=x&params2=y'})

      api = ProxyCrawl::API.new(token: 'test')

      response = api.post("http://httpbin.org/post", { foo: 'bar' }, { post_content_type: 'json'} )

      expect(response.status_code).to eql(200)
      expect(response.original_status).to eql(200)
      expect(response.pc_status).to eql(200)
      expect(response.url).to eql('http://httpbin.org/anything?param1=x&params2=y')
      expect(response.body).to eql('body')
    end

    it 'sends a post request to ProxyCrawl API with form data' do
      stub_request(:post, 'https://api.proxycrawl.com/?token=test&url=http://httpbin.org/post').
        with(body: { "foo" => "bar" }).
        to_return(
          body: 'body',
          status: 200,
          headers: { skip_normalize: true, 'original_status' => 200, 'pc_status' => 200, 'url' => 'http://httpbin.org/anything?param1=x&params2=y'})

      api = ProxyCrawl::API.new(token: 'test')

      response = api.post("http://httpbin.org/post", { foo: 'bar' } )

      expect(response.status_code).to eql(200)
      expect(response.original_status).to eql(200)
      expect(response.pc_status).to eql(200)
      expect(response.url).to eql('http://httpbin.org/anything?param1=x&params2=y')
      expect(response.body).to eql('body')
    end
  end

end