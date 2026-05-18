import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { classRegisterHtml, testRegisterHtml } from "@/utils/registerPdfHtml";
import type { ClassRegisterModel } from "@/models/ClassRegister";
import type { TestRegisterModel } from "@/models/TestSession";
import { DEMO_PDF_URI } from "@/mockDB/demoSeedPopulation";

export const registerPdfService = {
  async exportClassRegisterPdf(reg: ClassRegisterModel): Promise<{ uri: string; html: string }> {
    const html = reg.htmlSnapshot ?? classRegisterHtml(reg);
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    return { uri, html };
  },

  async exportTestRegisterPdf(reg: TestRegisterModel): Promise<{ uri: string; html: string }> {
    const html = reg.htmlSnapshot ?? testRegisterHtml(reg);
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    return { uri, html };
  },

  /** Resolve demo seed URI or missing PDF by generating from stored HTML */
  async ensureClassPdf(reg: ClassRegisterModel): Promise<{ uri: string; html: string }> {
    if (reg.pdfUri && reg.pdfUri !== DEMO_PDF_URI && !reg.pdfUri.startsWith("demo:")) {
      return { uri: reg.pdfUri, html: reg.htmlSnapshot ?? classRegisterHtml(reg) };
    }
    return this.exportClassRegisterPdf(reg);
  },

  async ensureTestPdf(reg: TestRegisterModel): Promise<{ uri: string; html: string }> {
    if (reg.pdfUri && reg.pdfUri !== DEMO_PDF_URI && !reg.pdfUri.startsWith("demo:")) {
      return { uri: reg.pdfUri, html: reg.htmlSnapshot ?? testRegisterHtml(reg) };
    }
    return this.exportTestRegisterPdf(reg);
  },

  async sharePdf(uri: string, dialogTitle: string): Promise<void> {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.open(uri, "_blank");
      return;
    }
    const can = await Sharing.isAvailableAsync();
    if (can) await Sharing.shareAsync(uri, { dialogTitle, mimeType: "application/pdf" });
  },

  async printHtml(html: string): Promise<void> {
    await Print.printAsync({ html });
  },
};
