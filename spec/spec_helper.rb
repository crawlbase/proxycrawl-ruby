# frozen_string_literal: true
require 'webmock/rspec'

WebMock.disable_net_connect!(allow_localhost: true)

# patch to optionaly skip normalizing webmock response headers
if defined? WebMock::Response
  WebMock::Response.class_eval do
    def headers=(headers)
      @headers = headers
      if @headers && !@headers.is_a?(Proc)
        @headers =
          if @headers.key?(:skip_normalize)
            @headers.delete(:skip_normalize)
            @headers
          else
            WebMock::Util::Headers.normalize_headers(@headers)
          end
      end
    end
  end
end