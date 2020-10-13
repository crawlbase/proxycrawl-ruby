# frozen_string_literal: true

module ProxyCrawl
  class ScraperAPI < ProxyCrawl::API

    def post
      raise 'Only GET is allowed for the ScraperAPI'
    end

    private

    def base_url
      'https://api.proxycrawl.com/scraper'
    end
  end
end
