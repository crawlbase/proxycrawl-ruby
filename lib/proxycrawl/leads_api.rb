# frozen_string_literal: true

require 'net/http'
require 'json'
require 'uri'

module ProxyCrawl
  class LeadsAPI
    attr_reader :token, :body, :status_code

    INVALID_TOKEN = 'Token is required'
    INVALID_DOMAIN = 'Domain is required'

    def initialize(options = {})
      raise INVALID_TOKEN if options[:token].nil?

      @token = options[:token]
    end

    def get(domain)
      raise INVALID_DOMAIN if domain.empty?

      uri = URI('https://api.proxycrawl.com/leads')
      uri.query = URI.encode_www_form({ token: token, domain: domain })

      response = Net::HTTP.get_response(uri)

      @status_code = response.code.to_i
      @body = response.body

      self
    end
  end
end
