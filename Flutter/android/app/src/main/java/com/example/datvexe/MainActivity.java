package com.example.datvexe;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.database.Cursor;
import android.provider.OpenableColumns;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.ByteArrayOutputStream;
import java.util.HashMap;
import java.util.Map;
import androidx.annotation.NonNull;
import io.flutter.embedding.android.FlutterActivity;
import io.flutter.embedding.engine.FlutterEngine;
import io.flutter.plugin.common.MethodChannel;

public class MainActivity extends FlutterActivity {
    private MethodChannel.Result pendingFile;
    private byte[] fileBytes;
    private static final int PICK = 4101, SAVE = 4102;
    @Override
    public void configureFlutterEngine(@NonNull FlutterEngine engine) {
        super.configureFlutterEngine(engine);
        new MethodChannel(engine.getDartExecutor().getBinaryMessenger(), "rightway/browser").setMethodCallHandler((call, result) -> {
            if (!call.method.equals("open")) { result.notImplemented(); return; }
            String url = call.argument("url"); Uri uri = url == null ? null : Uri.parse(url);
            if (uri == null || !("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()))) { result.error("INVALID_URL", "Liên kết không hợp lệ", null); return; }
            try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); result.success(true); }
            catch (Exception e) { result.error("BROWSER_UNAVAILABLE", "Không có trình duyệt", null); }
        });
        new MethodChannel(engine.getDartExecutor().getBinaryMessenger(), "rightway/files").setMethodCallHandler((call, result) -> {
            if (pendingFile != null) { result.error("BUSY", "Một thao tác file đang mở", null); return; }
            if (!call.method.equals("pickExcel") && !call.method.equals("save")) { result.notImplemented(); return; }
            pendingFile = result;
            try {
                if (call.method.equals("pickExcel")) {
                    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet").addCategory(Intent.CATEGORY_OPENABLE);
                    startActivityForResult(intent, PICK);
                } else {
                    fileBytes = call.argument("bytes"); String mime = call.argument("mime"); String name = call.argument("name");
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(mime == null ? "application/octet-stream" : mime).putExtra(Intent.EXTRA_TITLE, name);
                    startActivityForResult(intent, SAVE);
                }
            } catch (Exception e) { pendingFile = null; fileBytes = null; result.error("FILE_ERROR", "Không mở được trình chọn file", null); }
        });
    }
    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if ((requestCode != PICK && requestCode != SAVE) || pendingFile == null) return;
        MethodChannel.Result result = pendingFile; pendingFile = null;
        if (resultCode != Activity.RESULT_OK || data == null || data.getData() == null) { fileBytes = null; result.success(null); return; }
        Uri uri = data.getData();
        try {
            if (requestCode == SAVE) {
                try (OutputStream out = getContentResolver().openOutputStream(uri)) { if (out == null || fileBytes == null) throw new Exception(); out.write(fileBytes); }
                result.success(true);
            } else {
                String name = "trips.xlsx";
                try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) { if (cursor != null && cursor.moveToFirst()) { int column = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME); if (column >= 0) name = cursor.getString(column); } }
                try (InputStream in = getContentResolver().openInputStream(uri); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                    if (in == null) throw new Exception(); byte[] buffer = new byte[8192]; int count;
                    while ((count = in.read(buffer)) != -1) { if (out.size() + count > 5 * 1024 * 1024) throw new Exception("5MB"); out.write(buffer, 0, count); }
                    Map<String, Object> value = new HashMap<>(); value.put("name", name); value.put("bytes", out.toByteArray()); result.success(value);
                }
            }
        } catch (Exception e) { result.error("FILE_ERROR", "Không đọc/lưu được file. Excel tối đa 5 MB.", null); }
        finally { fileBytes = null; }
    }
}

