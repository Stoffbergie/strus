defmodule StrusIngest.AuthTest do
  use ExUnit.Case, async: true

  alias StrusIngest.Auth

  @secret "test-hmac-secret-for-unit-tests"

  describe "generate_key/2" do
    test "produces a key with strus_ prefix" do
      key = Auth.generate_key("user_123", @secret)
      assert String.starts_with?(key, "strus_")
    end

    test "key contains a dot separator" do
      key = Auth.generate_key("user_123", @secret)
      rest = String.trim_leading(key, "strus_")
      assert String.contains?(rest, ".")
    end

    test "different users produce different keys" do
      key1 = Auth.generate_key("user_1", @secret)
      key2 = Auth.generate_key("user_2", @secret)
      refute key1 == key2
    end

    test "same user and secret produces deterministic key" do
      key1 = Auth.generate_key("user_abc", @secret)
      key2 = Auth.generate_key("user_abc", @secret)
      assert key1 == key2
    end
  end

  describe "verify_key/2" do
    test "valid key returns user_id" do
      key = Auth.generate_key("user_123", @secret)
      assert {:ok, "user_123"} = Auth.verify_key(key, @secret)
    end

    test "wrong secret returns error" do
      key = Auth.generate_key("user_123", @secret)
      assert :error = Auth.verify_key(key, "wrong-secret")
    end

    test "tampered signature returns error" do
      key = Auth.generate_key("user_123", @secret)
      tampered = key <> "x"
      assert :error = Auth.verify_key(tampered, @secret)
    end

    test "tampered user_id returns error" do
      key = Auth.generate_key("user_123", @secret)
      [_prefix_and_id, _sig] = String.split(key, ".")
      fake_id = Base.url_encode64("evil_user", padding: false)
      tampered = "strus_" <> fake_id <> "." <> "fakesig"
      assert :error = Auth.verify_key(tampered, @secret)
    end

    test "missing prefix returns error" do
      assert :error = Auth.verify_key("no_prefix_here.sig", @secret)
    end

    test "empty string returns error" do
      assert :error = Auth.verify_key("", @secret)
    end

    test "missing dot returns error" do
      assert :error = Auth.verify_key("strus_nodot", @secret)
    end

    test "roundtrip with various user IDs" do
      ids = ["usr_abc123", "cm1234567890abcdef", "user@org", "a"]

      for id <- ids do
        key = Auth.generate_key(id, @secret)
        assert {:ok, ^id} = Auth.verify_key(key, @secret)
      end
    end
  end
end
