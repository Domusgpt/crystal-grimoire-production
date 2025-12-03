import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../theme/app_theme.dart';
import '../widgets/glassmorphic_container.dart';
import '../services/firebase_functions_service.dart';

class CollectionScreen extends StatefulWidget {
  const CollectionScreen({super.key});

  @override
  State<CollectionScreen> createState() => _CollectionScreenState();
}

class _CollectionScreenState extends State<CollectionScreen> {
  List<Map<String, dynamic>> _userCrystals = [];
  Map<String, dynamic>? _balanceData;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadUserCollection();
  }

  Future<void> _loadUserCollection() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        setState(() {
          _errorMessage = 'Please sign in to view your collection';
          _isLoading = false;
        });
        return;
      }

      // Use Cloud Functions backend
      final result = await FirebaseFunctionsService.getCrystalCollection();

      setState(() {
        _userCrystals = List<Map<String, dynamic>>.from(result['crystals'] ?? []);
        _balanceData = {
          'elementBalance': result['elementBalance'],
          'chakraBalance': result['chakraBalance'],
          'energyBalance': result['energyBalance'],
          'totalCrystals': result['totalCrystals'],
        };
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Error loading collection: $e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppTheme.deepMystical,
              AppTheme.mysticalPurple,
              AppTheme.deepMystical,
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // App Bar
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.arrow_back, color: Colors.white),
                    ),
                    const SizedBox(width: 10),
                    const Text(
                      '🔮 My Crystal Collection',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      onPressed: () {
                        setState(() {
                          _isLoading = true;
                          _errorMessage = null;
                        });
                        _loadUserCollection();
                      },
                      icon: const Icon(Icons.refresh, color: Colors.white),
                    ),
                  ],
                ),
              ),

              // Collection Statistics & Balance (if data available)
              if (_balanceData != null && !_isLoading && _errorMessage == null)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: _buildBalanceSection(),
                ),

              // Collection Grid
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: _buildCollectionContent(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCollectionContent() {
    if (_isLoading) {
      return const GlassmorphicContainer(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: AppTheme.crystalGlow),
              SizedBox(height: 20),
              Text(
                'Loading your crystal collection...',
                style: TextStyle(color: Colors.white, fontSize: 16),
              ),
            ],
          ),
        ),
      );
    }

    if (_errorMessage != null) {
      return GlassmorphicContainer(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.error_outline,
                color: Colors.red,
                size: 48,
              ),
              const SizedBox(height: 20),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, fontSize: 16),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () {
                  setState(() {
                    _isLoading = true;
                    _errorMessage = null;
                  });
                  _loadUserCollection();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.crystalGlow,
                ),
                child: const Text('Retry', style: TextStyle(color: Colors.black)),
              ),
            ],
          ),
        ),
      );
    }

    if (_userCrystals.isEmpty) {
      return GlassmorphicContainer(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.diamond_outlined,
                color: AppTheme.crystalGlow,
                size: 48,
              ),
              const SizedBox(height: 20),
              const Text(
                'Your crystal collection is empty',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                'Start by identifying crystals to add them to your collection',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.8),
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.crystalGlow,
                  padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 15),
                ),
                child: const Text(
                  'Go Identify Crystals',
                  style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return GlassmorphicContainer(
      child: GridView.builder(
        padding: const EdgeInsets.all(20),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 0.8,
          crossAxisSpacing: 15,
          mainAxisSpacing: 15,
        ),
        itemCount: _userCrystals.length,
        itemBuilder: (context, index) {
          final crystal = _userCrystals[index];
          return _buildCrystalCard(crystal);
        },
      ),
    );
  }

  Widget _buildBalanceSection() {
    final elementBalance = _balanceData!['elementBalance'] as Map<String, dynamic>?;
    final chakraBalance = _balanceData!['chakraBalance'] as Map<String, dynamic>?;
    final totalCrystals = _balanceData!['totalCrystals'] ?? 0;

    return GlassmorphicContainer(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Collection Overview',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Total Crystals: $totalCrystals',
              style: TextStyle(
                color: Colors.white.withOpacity(0.9),
                fontSize: 16,
              ),
            ),
            if (elementBalance != null) ...[
              const SizedBox(height: 15),
              const Text(
                'Element Balance',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 10),
              _buildBalanceBar('🌍 Earth', elementBalance['earth'] ?? 0.0, Colors.green),
              _buildBalanceBar('💨 Air', elementBalance['air'] ?? 0.0, Colors.lightBlue),
              _buildBalanceBar('🔥 Fire', elementBalance['fire'] ?? 0.0, Colors.orange),
              _buildBalanceBar('💧 Water', elementBalance['water'] ?? 0.0, Colors.blue),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildBalanceBar(String label, double percentage, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: TextStyle(
                color: Colors.white.withOpacity(0.9),
                fontSize: 14,
              ),
            ),
          ),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: percentage / 100,
                backgroundColor: Colors.white.withOpacity(0.2),
                valueColor: AlwaysStoppedAnimation<Color>(color),
                minHeight: 8,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Text(
            '${percentage.toStringAsFixed(0)}%',
            style: TextStyle(
              color: Colors.white.withOpacity(0.9),
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCrystalCard(Map<String, dynamic> crystal) {
    return GlassmorphicContainer(
      borderRadius: 15,
      child: InkWell(
        onTap: () => _showCrystalDetails(crystal),
        borderRadius: BorderRadius.circular(15),
        child: Padding(
          padding: const EdgeInsets.all(15),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Crystal icon/image placeholder
              Stack(
                children: [
                  Container(
                    width: double.infinity,
                    height: 80,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(10),
                      gradient: LinearGradient(
                        colors: [
                          AppTheme.crystalGlow.withOpacity(0.3),
                          AppTheme.amethystPurple.withOpacity(0.2),
                        ],
                      ),
                    ),
                    child: const Icon(
                      Icons.diamond,
                      size: 40,
                      color: AppTheme.crystalGlow,
                    ),
                  ),
                  Positioned(
                    top: 5,
                    right: 5,
                    child: PopupMenuButton<String>(
                      icon: Icon(Icons.more_vert, color: Colors.white, size: 18),
                      onSelected: (value) {
                        if (value == 'edit') {
                          _showEditDialog(crystal);
                        } else if (value == 'delete') {
                          _deleteCrystal(crystal['crystalId']);
                        }
                      },
                      itemBuilder: (context) => [
                        PopupMenuItem(
                          value: 'edit',
                          child: Row(
                            children: [
                              Icon(Icons.edit, size: 18),
                              SizedBox(width: 8),
                              Text('Edit Notes'),
                            ],
                          ),
                        ),
                        PopupMenuItem(
                          value: 'delete',
                          child: Row(
                            children: [
                              Icon(Icons.delete, size: 18, color: Colors.red),
                              SizedBox(width: 8),
                              Text('Remove', style: TextStyle(color: Colors.red)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              // Crystal name
              Text(
                crystal['name'] ?? 'Unknown Crystal',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 5),
              // Crystal variety
              if (crystal['variety'] != null)
                Text(
                  crystal['variety'],
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.7),
                    fontSize: 12,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              const Spacer(),
              // Personal notes indicator
              if (crystal['notes'] != null && crystal['notes'].toString().isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.crystalGlow.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'Has Notes',
                    style: TextStyle(
                      color: AppTheme.crystalGlow,
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  void _showCrystalDetails(Map<String, dynamic> crystal) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.deepMystical,
        title: Text(
          crystal['name'] ?? 'Crystal Details',
          style: const TextStyle(color: Colors.white),
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (crystal['variety'] != null) ...[
                Text('Variety: ${crystal['variety']}', style: TextStyle(color: Colors.white)),
                SizedBox(height: 10),
              ],
              if (crystal['notes'] != null && crystal['notes'].toString().isNotEmpty) ...[
                Text('Notes:', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                SizedBox(height: 5),
                Text(crystal['notes'], style: TextStyle(color: Colors.white.withOpacity(0.9))),
                SizedBox(height: 10),
              ],
              Text('Added: ${crystal['addedAt']}', style: TextStyle(color: Colors.white.withOpacity(0.7))),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close', style: TextStyle(color: AppTheme.crystalGlow)),
          ),
        ],
      ),
    );
  }

  void _showEditDialog(Map<String, dynamic> crystal) {
    final notesController = TextEditingController(text: crystal['notes'] ?? '');
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.deepMystical,
        title: Text('Edit Notes', style: TextStyle(color: Colors.white)),
        content: TextField(
          controller: notesController,
          maxLines: 5,
          style: TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: 'Add your personal notes...',
            hintStyle: TextStyle(color: Colors.white.withOpacity(0.5)),
            border: OutlineInputBorder(),
            enabledBorder: OutlineInputBorder(
              borderSide: BorderSide(color: Colors.white.withOpacity(0.3)),
            ),
            focusedBorder: OutlineInputBorder(
              borderSide: BorderSide(color: AppTheme.crystalGlow),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel', style: TextStyle(color: Colors.white.withOpacity(0.7))),
          ),
          ElevatedButton(
            onPressed: () async {
              try {
                await FirebaseFunctionsService.updateCrystalInCollection(
                  crystalId: crystal['crystalId'],
                  updates: {'notes': notesController.text},
                );
                Navigator.pop(context);
                _loadUserCollection(); // Reload collection
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Notes updated successfully')),
                );
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Error updating notes: $e')),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.crystalGlow),
            child: Text('Save', style: TextStyle(color: Colors.black)),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteCrystal(String crystalId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.deepMystical,
        title: Text('Remove Crystal?', style: TextStyle(color: Colors.white)),
        content: Text(
          'Are you sure you want to remove this crystal from your collection?',
          style: TextStyle(color: Colors.white.withOpacity(0.9)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancel', style: TextStyle(color: Colors.white.withOpacity(0.7))),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: Text('Remove'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await FirebaseFunctionsService.removeCrystalFromCollection(crystalId: crystalId);
        _loadUserCollection(); // Reload collection
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Crystal removed from collection')),
        );
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error removing crystal: $e')),
        );
      }
    }
  }
}