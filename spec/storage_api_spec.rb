require 'spec_helper'
require 'proxycrawl'

describe ProxyCrawl::StorageAPI do
  it 'raises an error if token is missing' do
    expect { ProxyCrawl::StorageAPI.new }.to raise_error(RuntimeError, 'Token is required')
  end

  context '#get' do
    before(:each) do
      stub_request(:get, 'https://api.proxycrawl.com/storage?format=html&rid=1&token=test')
        .to_return(
          status: 200,
          body: {
            stored_at: '2021-03-01T14:22:58+02:00',
            original_status: 200,
            pc_status: 200,
            rid: '1',
            url: 'https://www.apple.com',
            body: '<html><head><title>Apple</title></head><body>Apple</body></html>'
          }.to_json
        )
    end

    subject { ProxyCrawl::StorageAPI.new(token: 'test') }

    it 'raises an error if parameter is missing' do
      expect { subject.get(nil) }.to raise_error(RuntimeError, 'Either URL or RID is required')
    end

    it 'returns storage info' do
      subject.get('1')
      expect(subject.body).to eq(
        {
          stored_at: '2021-03-01T14:22:58+02:00',
          original_status: 200,
          pc_status: 200,
          rid: '1',
          url: 'https://www.apple.com',
          body: '<html><head><title>Apple</title></head><body>Apple</body></html>'
        }.to_json
      )
    end
  end

  context '#delete' do
    subject { ProxyCrawl::StorageAPI.new(token: 'test') }

    it 'raises an error if parameter is missing' do
      expect { subject.delete(nil) }.to raise_error(RuntimeError, 'RID is required')
    end
  end

  context '#bulk' do
    before(:each) do
      stub_request(:post, 'http://api.proxycrawl.com/storage/bulk?token=test')
        .with(
          body: { rids: %w[1 2 3] }.to_json
        )
        .to_return(
          status: 200,
          body: [
            {
              stored_at: '2021-03-01T14:22:58+02:00',
              original_status: 200,
              pc_status: 200,
              rid: '1',
              url: 'https://www.apple.com',
              body: '<html><head><title>Apple</title></head><body>Apple</body></html>'
            },
            {
              stored_at: '2021-03-02T14:22:58+02:00',
              original_status: 200,
              pc_status: 200,
              rid: '2',
              url: 'https://www.google.com',
              body: '<html><head><title>Google</title></head><body>Google</body></html>'
            },
            {
              stored_at: '2021-03-03T14:22:58+02:00',
              original_status: 200,
              pc_status: 200,
              rid: '3',
              url: 'https://www.espn.com',
              body: '<html><head><title>ESPN</title></head><body>ESPN</body></html>'
            }
          ].to_json
        )
    end

    subject { ProxyCrawl::StorageAPI.new(token: 'test') }

    it 'raises an error if parameter is missing' do
      expect { subject.bulk([]) }.to raise_error(RuntimeError, 'One or more RIDs are required')
    end

    it 'returns an an array of storage info' do
      subject.bulk(%w[1 2 3])
      expect(subject.body).to eq(
        [
          {
            'body' => '<html><head><title>Apple</title></head><body>Apple</body></html>',
            'original_status' => 200,
            'pc_status' => 200,
            'rid' => '1',
            'stored_at' => '2021-03-01T14:22:58+02:00',
            'url' => 'https://www.apple.com'
          },
          {
            'body' => '<html><head><title>Google</title></head><body>Google</body></html>',
            'original_status' => 200,
            'pc_status' => 200,
            'rid' => '2',
            'stored_at' => '2021-03-02T14:22:58+02:00',
            'url' => 'https://www.google.com'
          },
          {
            'body' => '<html><head><title>ESPN</title></head><body>ESPN</body></html>',
            'original_status' => 200,
            'pc_status' => 200,
            'rid' => '3',
            'stored_at' => '2021-03-03T14:22:58+02:00',
            'url' => 'https://www.espn.com'
          }
        ]
      )
      expect(subject.rid).to eq(%w[1 2 3])
      expect(subject.stored_at).to eq(
        [
          '2021-03-01T14:22:58+02:00',
          '2021-03-02T14:22:58+02:00',
          '2021-03-03T14:22:58+02:00'
        ]
      )
      expect(subject.url).to eq(
        [
          'https://www.apple.com',
          'https://www.google.com',
          'https://www.espn.com'
        ]
      )
    end
  end

  context '#rids' do
    before(:each) do
      stub_request(:get, 'https://api.proxycrawl.com/storage/rids?token=test')
        .to_return(
          body: %w[1 2 3].to_json,
          status: 200,
          headers: { skip_normalize: true }
        )
    end

    subject { ProxyCrawl::StorageAPI.new(token: 'test') }

    it 'returns an array of rids' do
      expect(subject.rids).to eq(%w[1 2 3])
      expect(subject.body).to eq(%w[1 2 3])
      expect(subject.rid).to eq(%w[1 2 3])
    end
  end

  context '#total_count' do
    before(:each) do
      stub_request(:get, 'https://api.proxycrawl.com/storage/total_count?token=test')
        .to_return(
          body: '{"totalCount": 123}',
          status: 200,
          headers: { skip_normalize: true }
        )
    end

    subject { ProxyCrawl::StorageAPI.new(token: 'test') }

    it 'returns the total count' do
      expect(subject.total_count).to eq(123)
    end
  end
end
