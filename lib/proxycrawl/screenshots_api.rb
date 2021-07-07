# frozen_string_literal: true

require 'securerandom'
require 'tmpdir'

module ProxyCrawl
  class ScreenshotsAPI < ProxyCrawl::API
    attr_reader :screenshot_path, :success, :remaining_requests, :screenshot_url

    INVALID_SAVE_TO_PATH_FILENAME = 'Filename must end with .jpg or .jpeg'
    SAVE_TO_PATH_FILENAME_PATTERN = /.+\.(jpg|JPG|jpeg|JPEG)$/.freeze

    def post
      raise 'Only GET is allowed for the ScreenshotsAPI'
    end

    def get(url, options = {})
      screenshot_path = options.delete(:save_to_path) || generate_file_path
      raise INVALID_SAVE_TO_PATH_FILENAME unless SAVE_TO_PATH_FILENAME_PATTERN =~ screenshot_path

      response = super(url, options)
      file = File.open(screenshot_path, 'w+')
      file.write(response.body&.force_encoding('UTF-8'))
      @screenshot_path = screenshot_path
      yield(file) if block_given?
      response
    ensure
      file&.close
    end

    private

    def prepare_response(response, format)
      super(response, format)
      @remaining_requests = response['remaining_requests'].to_i
      @success = response['success'] == 'true'
      @screenshot_url = response['screenshot_url']
    end

    def base_url
      'https://api.proxycrawl.com/screenshots'
    end

    def generate_file_name
      "#{SecureRandom.urlsafe_base64}.jpg"
    end

    def generate_file_path
      File.join(Dir.tmpdir, generate_file_name)
    end
  end
end
