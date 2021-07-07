require 'spec_helper.rb'
require 'proxycrawl'

describe ProxyCrawl::ScreenshotsAPI do
  it 'raises an error if token is missing' do
    expect { ProxyCrawl::ScreenshotsAPI.new }.to raise_error(RuntimeError, 'Token is required')
  end

  it 'sets/reads token' do
    expect(ProxyCrawl::ScreenshotsAPI.new(token: 'test').token).to eql('test')
  end

  describe '#get' do
    before(:each) do
      stub_request(:get, 'https://api.proxycrawl.com/screenshots?token=test&url=http%3A%2F%2Fhttpbin.org%2Fanything%3Fparam1%3Dx%26params2%3Dy').
        to_return(
          body: 'body',
          status: 200,
          headers: { skip_normalize: true, 'original_status' => 200, 'pc_status' => 200, 'url' => 'http://httpbin.org/anything?param1=x&params2=y'})
    end

    it 'sends an get request to ProxyCrawl Screenshots API' do
      api = ProxyCrawl::ScreenshotsAPI.new(token: 'test')

      response = api.get("http://httpbin.org/anything?param1=x&params2=y")

      expect(response.status_code).to eql(200)
      expect(response.original_status).to eql(200)
      expect(response.pc_status).to eql(200)
      expect(response.url).to eql('http://httpbin.org/anything?param1=x&params2=y')
      expect(response.body).to eql('body')
      expect(response.screenshot_path).not_to be_empty
    end

    it 'accepts a valid save_to_path option' do
      api = ProxyCrawl::ScreenshotsAPI.new(token: 'test')

      response = api.get("http://httpbin.org/anything?param1=x&params2=y", save_to_path: save_to_path)

      expect(response.status_code).to eql(200)
      expect(response.original_status).to eql(200)
      expect(response.pc_status).to eql(200)
      expect(response.url).to eql('http://httpbin.org/anything?param1=x&params2=y')
      expect(response.body).to eql('body')
      expect(response.screenshot_path).to eql(File.join(Dir.tmpdir, 'test-image.jpg'))
    end

    it 'rejects an invalid save_to_path option' do
      api = ProxyCrawl::ScreenshotsAPI.new(token: 'test')

      expect { api.get("http://httpbin.org/anything?param1=x&params2=y", save_to_path: '~/images/image_filename.png') }.to raise_error(RuntimeError, 'Filename must end with .jpg or .jpeg')
      expect { api.get("http://httpbin.org/anything?param1=x&params2=y", save_to_path: 'image_filename.png') }.to raise_error(RuntimeError, 'Filename must end with .jpg or .jpeg')
      expect { api.get("http://httpbin.org/anything?param1=x&params2=y", save_to_path: '~/images/image_filename') }.to raise_error(RuntimeError, 'Filename must end with .jpg or .jpeg')
      expect { api.get("http://httpbin.org/anything?param1=x&params2=y", save_to_path: 'image_filename') }.to raise_error(RuntimeError, 'Filename must end with .jpg or .jpeg')
    end

    it 'accepts a block' do
      api = ProxyCrawl::ScreenshotsAPI.new(token: 'test')

      response = api.get("http://httpbin.org/anything?param1=x&params2=y", save_to_path: save_to_path) do |file|
        expect(file).to be_kind_of(File)
        expect(file.path).to eql(File.join(Dir.tmpdir, 'test-image.jpg'))
      end

      expect(response.status_code).to eql(200)
      expect(response.original_status).to eql(200)
      expect(response.pc_status).to eql(200)
      expect(response.url).to eql('http://httpbin.org/anything?param1=x&params2=y')
      expect(response.body).to eql('body')
      expect(response.screenshot_path).to eql(File.join(Dir.tmpdir, 'test-image.jpg'))
    end
  end

  private

  def save_to_path
    File.join(Dir.tmpdir, 'test-image.jpg')
  end
end
