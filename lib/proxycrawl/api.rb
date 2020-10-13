# frozen_string_literal: true

require 'net/http'
require 'json'
require 'uri'

module ProxyCrawl
  class API
    attr_reader :token, :body, :status_code, :original_status, :pc_status, :url

    INVALID_TOKEN = 'Token is required'
    INVALID_URL = 'URL is required'

    def initialize(options = {})
      raise INVALID_TOKEN if options[:token].nil?

      @token = options[:token]
    end

    def get(url, options = {})
      raise INVALID_URL if url.empty?

      uri = prepare_uri(url, options)

      response = Net::HTTP.get_response(uri)

      prepare_response(response, options[:format])

      self
    end

    def post(url, data, options = {})
      raise INVALID_URL if url.empty?

      uri = prepare_uri(url, options)

      http = Net::HTTP.new(uri.host, uri.port)

      http.use_ssl = true

      content_type = options[:post_content_type].to_s.include?('json') ? { 'Content-Type': 'text/json' } : nil

      request = Net::HTTP::Post.new(uri.request_uri, content_type)

      if options[:post_content_type].to_s.include?('json')
        request.body = data.to_json
      else
        request.set_form_data(data)
      end

      response = http.request(request)

      prepare_response(response, options[:format])

      self
    end

    private

    def base_url
      'https://api.proxycrawl.com'
    end

    def prepare_uri(url, options)
      uri = URI(base_url)
      uri.query = URI.encode_www_form({ token: @token, url: url }.merge(options))

      uri
    end

    def prepare_response(response, format)
      if format == 'json' || base_url.include?('/scraper')
        @status_code = response.code.to_i
        @body = response.body
      else
        @original_status = response['original_status'].to_i
        @status_code = response.code.to_i
        @pc_status = response['pc_status'].to_i
        @url = response['url']
        @body = response.body
      end
    end
  end
end
