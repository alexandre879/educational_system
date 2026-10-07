"use client";

// antd v5 needs this patch on React 19, otherwise static APIs such as
// `message.success()` and `Modal.confirm()` silently render nothing.
import "@ant-design/v5-patch-for-react-19";

export default function AntdReact19Patch() {
  return null;
}
