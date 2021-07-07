# frozen_string_literal: true

module ProxyCrawl
  class ScraperAPI < ProxyCrawl::API
    attr_reader :remaining_requests

    def post
      raise 'Only GET is allowed for the ScraperAPI'
    end

    private

    def prepare_response(response, format)
      super(response, format)
      json_body = JSON.parse(response.body)
      @remaining_requests = json_body['remaining_requests'].to_i
    end

    def base_url
      'https://api.proxycrawl.com/scraper'
    end
  end
end
