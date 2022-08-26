# frozen_string_literal: true

require 'net/http'
require 'json'
require 'uri'

module ProxyCrawl
  class StorageAPI
    attr_reader :token, :timeout, :original_status, :pc_status, :url, :status_code, :rid, :body, :stored_at

    INVALID_TOKEN = 'Token is required'
    INVALID_RID = 'RID is required'
    INVALID_RID_ARRAY = 'One or more RIDs are required'
    INVALID_URL_OR_RID = 'Either URL or RID is required'
    BASE_URL = 'https://api.proxycrawl.com/storage'

    def initialize(options = {})
      raise INVALID_TOKEN if options[:token].nil? || options[:token].empty?

      @token = options[:token]
      @timeout = options[:timeout] || 120
    end

    def get(url_or_rid, format = 'html')
      raise INVALID_URL_OR_RID if url_or_rid.nil? || url_or_rid.empty?

      uri = URI(BASE_URL)
      uri.query = URI.encode_www_form({ token: token, format: format }.merge(decide_url_or_rid(url_or_rid)))

      req = Net::HTTP::Get.new(uri)

      req_options = {
        read_timeout: timeout,
        use_ssl: uri.scheme == 'https',
        verify_mode: OpenSSL::SSL::VERIFY_NONE
      }

      response = Net::HTTP.start(uri.hostname, uri.port, req_options) { |http| http.request(req) }

      res = format == 'json' ? JSON.parse(response.body) : response

      @original_status = res['original_status'].to_i
      @pc_status = res['pc_status'].to_i
      @url = res['url']
      @rid = res['rid']
      @stored_at = res['stored_at']

      @status_code = response.code.to_i
      @body = response.body

      self
    end

    def delete(rid)
      raise INVALID_RID if rid.nil? || rid.empty?

      uri = URI(BASE_URL)
      uri.query = URI.encode_www_form(token: token, rid: rid)
      http = Net::HTTP.new(uri.host)
      request = Net::HTTP::Delete.new(uri.request_uri)
      response = http.request(request)

      @url, @original_status, @pc_status, @stored_at = nil
      @status_code = response.code.to_i
      @rid = rid
      @body = JSON.parse(response.body)

      @body.key?('success')
    end

    def bulk(rids_array = [])
      raise INVALID_RID_ARRAY if rids_array.empty?

      uri = URI("#{BASE_URL}/bulk")
      uri.query = URI.encode_www_form(token: token)
      http = Net::HTTP.new(uri.host)
      request = Net::HTTP::Post.new(uri.request_uri, { 'Content-Type': 'application/json' })
      request.body = { rids: rids_array }.to_json
      response = http.request(request)

      @body = JSON.parse(response.body)
      @original_status = @body.map { |item| item['original_status'].to_i }
      @status_code = response.code.to_i
      @pc_status = @body.map { |item| item['pc_status'].to_i }
      @url = @body.map { |item| item['url'] }
      @rid = @body.map { |item| item['rid'] }
      @stored_at = @body.map { |item| item['stored_at'] }

      self
    end

    def rids(limit = -1)
      uri = URI("#{BASE_URL}/rids")
      query_hash = { token: token }
      query_hash.merge!({ limit: limit }) if limit >= 0
      uri.query = URI.encode_www_form(query_hash)

      response = Net::HTTP.get_response(uri)
      @url, @original_status, @pc_status, @stored_at = nil
      @status_code = response.code.to_i
      @body = JSON.parse(response.body)
      @rid = @body

      @body
    end

    def total_count
      uri = URI("#{BASE_URL}/total_count")
      uri.query = URI.encode_www_form(token: token)

      response = Net::HTTP.get_response(uri)
      @url, @original_status, @pc_status, @stored_at = nil
      @status_code = response.code.to_i
      @rid = rid
      @body = JSON.parse(response.body)

      body['totalCount']
    end

    private

    def decide_url_or_rid(url_or_rid)
      %r{^https?://} =~ url_or_rid ? { url: url_or_rid } : { rid: url_or_rid }
    end
  end
end
