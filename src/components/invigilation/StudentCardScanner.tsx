import { useCallback, useRef } from "react";
import { Platform, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

import { AppButton } from "@/components/ui/AppButton";
import { colors } from "@/theme";

type Props = {
  onScan: (payload: string) => void;
  disabled?: boolean;
  hint?: string;
};

/** Scan MUT student card barcodes (Code128 / QR with MUT:studentNumber) */
export function StudentCardScanner({ onScan, disabled, hint }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const lastScan = useRef("");

  const handleBarcode = useCallback(
    ({ data }: { data: string }) => {
      if (disabled || !data || data === lastScan.current) return;
      lastScan.current = data;
      onScan(data);
      setTimeout(() => {
        lastScan.current = "";
      }, 2000);
    },
    [disabled, onScan]
  );

  if (Platform.OS === "web") {
    return (
      <Text style={{ color: colors.ink.muted, lineHeight: 22 }}>
        Card scanning runs on a device with a camera. Use manual student number entry on web.
      </Text>
    );
  }

  if (!permission?.granted) {
    return (
      <AppButton
        title="Allow camera for card scan"
        onPress={() => requestPermission()}
        disabled={disabled}
      />
    );
  }

  return (
    <View>
      {hint ? (
        <Text style={{ color: colors.ink.muted, marginBottom: 10, fontSize: 13 }}>{hint}</Text>
      ) : null}
      <View style={{ height: 220, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.border.subtle }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["code128", "code39", "qr", "ean13"],
          }}
          onBarcodeScanned={disabled ? undefined : handleBarcode}
        />
      </View>
    </View>
  );
}
