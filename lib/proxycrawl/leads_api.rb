# frozen_string_literal: true

require 'net/http'
require 'json'
require 'uri'

module ProxyCrawl
  class LeadsAPI
    attr_reader :token, :timeout, :body, :status_code, :success, :remaining_requests

    INVALID_TOKEN = 'Token is required'
    INVALID_DOMAIN = 'Domain is required'

    def initialize(options = {})
      raise INVALID_TOKEN if options[:token].nil? || options[:token].empty?

      @token = options[:token]
      @timeout = options[:timeout] || 120
    end

    def get(domain)
      raise INVALID_DOMAIN if domain.empty?

      uri = URI('https://api.proxycrawl.com/leads')
      uri.query = URI.encode_www_form({ token: token, domain: domain })

      req = Net::HTTP::Get.new(uri)

      req_options = {
        read_timeout: timeout,
        use_ssl: uri.scheme == 'https',
        verify_mode: OpenSSL::SSL::VERIFY_NONE
      }

      response = Net::HTTP.start(uri.hostname, uri.port, req_options) { |http| http.request(req) }
      @status_code = response.code.to_i
      @body = response.body

      json_body = JSON.parse(response.body)
      @success = json_body['success']
      @remaining_requests = json_body['remaining_requests'].to_i

      self
    end

    def post
      raise 'Only GET is allowed for the LeadsAPI'
    end
  end
end
