import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:image/image.dart' as img;

/// Service for caching crystal thumbnails locally to reduce Firebase Storage costs
/// Stores 200px thumbnails with a 50MB max cache size
class ImageCacheService {
  static const int thumbnailSize = 200; // pixels
  static const int maxCacheSizeBytes = 50 * 1024 * 1024; // 50MB
  static const String _cacheKey = 'crystal_thumbnail_cache_size';
  static const String _cacheDir = 'crystal_thumbnails';

  static int _currentCacheSize = 0;
  static bool _initialized = false;

  /// Initialize the cache service and calculate current cache size
  static Future<void> init() async {
    if (_initialized || kIsWeb) return;

    try {
      final prefs = await SharedPreferences.getInstance();
      _currentCacheSize = prefs.getInt(_cacheKey) ?? 0;
      _initialized = true;
    } catch (e) {
      _currentCacheSize = 0;
      _initialized = true;
    }
  }

  /// Get the thumbnail directory path
  static Future<String> _getThumbnailDir() async {
    final dir = await getApplicationDocumentsDirectory();
    final thumbnailDir = Directory('${dir.path}/$_cacheDir');
    if (!await thumbnailDir.exists()) {
      await thumbnailDir.create(recursive: true);
    }
    return thumbnailDir.path;
  }

  /// Get local path for a crystal's thumbnail
  static Future<String> _getLocalPath(String crystalId) async {
    final dir = await _getThumbnailDir();
    return '$dir/$crystalId.jpg';
  }

  /// Compress image to thumbnail size (200px)
  static Future<Uint8List?> compressToThumbnail(Uint8List imageData) async {
    try {
      // Decode image
      final image = img.decodeImage(imageData);
      if (image == null) return null;

      // Calculate new dimensions maintaining aspect ratio
      int newWidth, newHeight;
      if (image.width > image.height) {
        newWidth = thumbnailSize;
        newHeight = (image.height * thumbnailSize / image.width).round();
      } else {
        newHeight = thumbnailSize;
        newWidth = (image.width * thumbnailSize / image.height).round();
      }

      // Resize image
      final thumbnail = img.copyResize(
        image,
        width: newWidth,
        height: newHeight,
        interpolation: img.Interpolation.linear,
      );

      // Encode as JPEG with quality 85
      return Uint8List.fromList(img.encodeJpg(thumbnail, quality: 85));
    } catch (e) {
      print('Error compressing thumbnail: $e');
      return null;
    }
  }

  /// Save thumbnail locally when crystal is added to collection
  /// Returns the local file path if successful, null otherwise
  static Future<String?> cacheCollectionThumbnail(
    String crystalId,
    Uint8List fullImage,
  ) async {
    if (kIsWeb) return null; // Web uses network images directly

    try {
      await init();

      // Compress to thumbnail
      final thumbnail = await compressToThumbnail(fullImage);
      if (thumbnail == null) return null;

      // Check if we need to prune cache first
      if (_currentCacheSize + thumbnail.length > maxCacheSizeBytes) {
        await pruneCache(thumbnail.length);
      }

      // Save to local file
      final localPath = await _getLocalPath(crystalId);
      final file = File(localPath);
      await file.writeAsBytes(thumbnail);

      // Update cache size
      _currentCacheSize += thumbnail.length;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_cacheKey, _currentCacheSize);

      print('💾 Cached thumbnail for $crystalId (${thumbnail.length} bytes)');
      return localPath;
    } catch (e) {
      print('Error caching thumbnail: $e');
      return null;
    }
  }

  /// Get thumbnail - local first, returns null if not cached
  static Future<Uint8List?> getThumbnail(String crystalId) async {
    if (kIsWeb) return null; // Web uses network images

    try {
      await init();

      final localPath = await _getLocalPath(crystalId);
      final file = File(localPath);

      if (await file.exists()) {
        return await file.readAsBytes();
      }

      return null;
    } catch (e) {
      print('Error getting thumbnail: $e');
      return null;
    }
  }

  /// Check if thumbnail exists locally
  static Future<bool> hasThumbnail(String crystalId) async {
    if (kIsWeb) return false;

    try {
      final localPath = await _getLocalPath(crystalId);
      return await File(localPath).exists();
    } catch (e) {
      return false;
    }
  }

  /// Delete a specific thumbnail
  static Future<void> deleteThumbnail(String crystalId) async {
    if (kIsWeb) return;

    try {
      final localPath = await _getLocalPath(crystalId);
      final file = File(localPath);

      if (await file.exists()) {
        final size = await file.length();
        await file.delete();

        _currentCacheSize -= size;
        if (_currentCacheSize < 0) _currentCacheSize = 0;

        final prefs = await SharedPreferences.getInstance();
        await prefs.setInt(_cacheKey, _currentCacheSize);
      }
    } catch (e) {
      print('Error deleting thumbnail: $e');
    }
  }

  /// Prune cache to make room for new thumbnails
  /// Removes oldest files until we have enough space
  static Future<void> pruneCache(int requiredSpace) async {
    if (kIsWeb) return;

    try {
      final dir = Directory(await _getThumbnailDir());
      if (!await dir.exists()) return;

      // Get all files with their modification times
      final files = <FileSystemEntity>[];
      await for (final entity in dir.list()) {
        if (entity is File) {
          files.add(entity);
        }
      }

      // Sort by modification time (oldest first)
      files.sort((a, b) {
        final aTime = (a as File).lastModifiedSync();
        final bTime = (b as File).lastModifiedSync();
        return aTime.compareTo(bTime);
      });

      // Delete oldest files until we have enough space
      int freedSpace = 0;
      final targetSpace = requiredSpace + (maxCacheSizeBytes ~/ 10); // Free 10% extra

      for (final entity in files) {
        if (_currentCacheSize - freedSpace + requiredSpace <= maxCacheSizeBytes - targetSpace) {
          break;
        }

        try {
          final file = entity as File;
          final size = await file.length();
          await file.delete();
          freedSpace += size;
          print('🗑️ Pruned cache file: ${file.path} ($size bytes)');
        } catch (e) {
          // Continue with next file
        }
      }

      _currentCacheSize -= freedSpace;
      if (_currentCacheSize < 0) _currentCacheSize = 0;

      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_cacheKey, _currentCacheSize);

      print('📦 Cache pruned: freed $freedSpace bytes');
    } catch (e) {
      print('Error pruning cache: $e');
    }
  }

  /// Clear entire thumbnail cache
  static Future<void> clearCache() async {
    if (kIsWeb) return;

    try {
      final dir = Directory(await _getThumbnailDir());
      if (await dir.exists()) {
        await dir.delete(recursive: true);
      }

      _currentCacheSize = 0;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_cacheKey, 0);

      print('🗑️ Thumbnail cache cleared');
    } catch (e) {
      print('Error clearing cache: $e');
    }
  }

  /// Get current cache size in bytes
  static int get currentCacheSize => _currentCacheSize;

  /// Get cache size as formatted string
  static String get cacheSizeFormatted {
    if (_currentCacheSize < 1024) {
      return '$_currentCacheSize B';
    } else if (_currentCacheSize < 1024 * 1024) {
      return '${(_currentCacheSize / 1024).toStringAsFixed(1)} KB';
    } else {
      return '${(_currentCacheSize / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
  }

  /// Get cache usage percentage
  static double get cacheUsagePercent => _currentCacheSize / maxCacheSizeBytes;
}
