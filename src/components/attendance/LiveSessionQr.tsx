import { useEffect, useState } from "react";
import { Image, View } from "react-native";
import QRCode from "qrcode";

import { colors } from "@/theme";

/**
 * QR via PNG data URL — works on web, iOS, and Android without react-native-qrcode-svg / SVG chains.
 */
export function LiveSessionQr({ value }: { value: string }) {
  const [dataUri, setDataUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      width: 210,
      margin: 1,
      color: { dark: colors.ink.default, light: colors.surface.base },
      errorCorrectionLevel: "M",
    })
      .then((uri) => {
        if (!cancelled) setDataUri(uri);
      })
      .catch(() => {
        if (!cancelled) setDataUri(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!dataUri) {
    return <View style={{ width: 210, height: 210, backgroundColor: colors.surface.soft, borderRadius: 8 }} />;
  }

  return (
    <Image
      source={{ uri: dataUri }}
      style={{ width: 210, height: 210 }}
      resizeMode="contain"
      accessibilityLabel="Attendance QR code"
    />
  );
}
