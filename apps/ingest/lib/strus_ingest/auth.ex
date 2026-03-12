defmodule StrusIngest.Auth do
  @moduledoc """
  HMAC-based API key verification.

  Key format: strus_<base64url(user_id)>.<base64url(hmac_sha256)>

  The user_id is encoded in the token itself. The HMAC signature proves
  it was issued by a trusted party (the Next.js dashboard) that knows
  the shared secret. No database roundtrip needed for auth.
  """

  @prefix "strus_"

  def generate_key(user_id, secret) do
    encoded_id = Base.url_encode64(user_id, padding: false)
    signature = sign(encoded_id, secret)
    @prefix <> encoded_id <> "." <> signature
  end

  def verify_key(key, secret) do
    with {:ok, rest} <- strip_prefix(key),
         {:ok, encoded_id, provided_sig} <- split_parts(rest),
         expected_sig <- sign(encoded_id, secret),
         true <- Plug.Crypto.secure_compare(provided_sig, expected_sig),
         {:ok, user_id} <- Base.url_decode64(encoded_id, padding: false) do
      {:ok, user_id}
    else
      _ -> :error
    end
  end

  defp strip_prefix(<<@prefix, rest::binary>>), do: {:ok, rest}
  defp strip_prefix(_), do: :error

  defp split_parts(rest) do
    case String.split(rest, ".", parts: 2) do
      [encoded_id, sig] when byte_size(encoded_id) > 0 and byte_size(sig) > 0 ->
        {:ok, encoded_id, sig}

      _ ->
        :error
    end
  end

  defp sign(encoded_id, secret) do
    :crypto.mac(:hmac, :sha256, secret, encoded_id)
    |> Base.url_encode64(padding: false)
  end
end
