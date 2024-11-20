/**
 * Tests whether a simple situation of a valid config of 3 explicitly
 * activated extensions with 1 interdependency (extreme-is-the-new-normal depends on graphicsApiReplacer).
 * Can be solved deterministically by the import strategies.
 */

/* eslint-disable import/first */
import { describe, expect, test } from 'vitest';

import { ExtensionsState } from '../../../../function/extensions/extensions-state';
import { attemptStrategies } from './import-button-callback';
import { deserializeSimplifiedSerializedExtensionsStateFromExtensions } from '../../../../testing/dump-extensions-state';
import { extensionToID } from '../../../../function/extensions/dependency-management/dependency-resolution';
import { fullStrategy, sparseStrategy } from './import-strategies';

const configFileJSON = `{
  "meta": {
      "version": "1.0.0"
  },
  "active": true,
  "config-sparse": {
      "modules": {
          "graphicsApiReplacer": {
              "config": {
                  "window": {
                      "type": {
                          "contents": {
                              "suggested-value": "window"
                          }
                      }
                  }
              }
          },
          "running-units": {
              "config": {}
          }
      },
      "plugins": {
          "extreme-is-the-new-normal": {
              "config": {}
          }
      },
      "load-order": [
          {
              "extension": "extreme-is-the-new-normal",
              "version": "1.0.0"
          },
          {
              "extension": "graphicsApiReplacer",
              "version": "1.2.0"
          },
          {
              "extension": "running-units",
              "version": "1.0.1"
          }
      ]
  },
  "config-full": {
      "modules": {
          "ucp2-legacy": {
              "config": {
                  "ai_access": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "ai_assaultswitch": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "ai_buywood": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "ai_defense": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "ai_fix_crusader_archers_pitch": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "ai_fix_laddermen_with_enclosed_keep": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "ai_nosleep": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "ai_rebuild": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "ai_tethers": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "ai_towerengines": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "ai_housing": {
                      "build_housing": {
                          "contents": {
                              "value": {
                                  "enabled": false,
                                  "sliderValue": 5
                              }
                          }
                      },
                      "campfire_housing": {
                          "contents": {
                              "value": {
                                  "enabled": false,
                                  "sliderValue": 8
                              }
                          }
                      },
                      "delete_housing": {
                          "enabled": {
                              "contents": {
                                  "value": false
                              }
                          }
                      }
                  },
                  "ai_resources_rebuy": {
                      "flour": {
                          "contents": {
                              "value": {
                                  "enabled": false,
                                  "sliderValue": 36
                              }
                          }
                      },
                      "iron": {
                          "contents": {
                              "value": {
                                  "enabled": false,
                                  "sliderValue": 36
                              }
                          }
                      },
                      "wood": {
                          "contents": {
                              "value": {
                                  "enabled": false,
                                  "sliderValue": 36
                              }
                          }
                      }
                  },
                  "ai_demolish": {
                      "ai_demolish_walls": {
                          "enabled": {
                              "contents": {
                                  "value": false
                              }
                          }
                      },
                      "ai_demolish_trapped": {
                          "enabled": {
                              "contents": {
                                  "value": false
                              }
                          }
                      },
                      "ai_demolish_eco": {
                          "enabled": {
                              "contents": {
                                  "value": false
                              }
                          }
                      }
                  },
                  "ai_addattack": {
                      "contents": {
                          "value": {
                              "enabled": false,
                              "choice": "absolute",
                              "choices": {
                                  "absolute": {
                                      "slider": 5
                                  },
                                  "relative": {
                                      "slider": 0.3
                                  }
                              }
                          }
                      }
                  },
                  "ai_attacklimit": {
                      "contents": {
                          "value": {
                              "enabled": false,
                              "sliderValue": 500
                          }
                      }
                  },
                  "ai_attacktarget": {
                      "contents": {
                          "value": {
                              "enabled": false,
                              "choice": ""
                          }
                      }
                  },
                  "ai_attackwave": {
                      "contents": {
                          "value": {
                              "enabled": false,
                              "sliderValue": 7
                          }
                      }
                  },
                  "ai_recruitinterval": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "ai_recruitstate_initialtimer": {
                      "contents": {
                          "value": {
                              "enabled": false,
                              "sliderValue": 0
                          }
                      }
                  },
                  "fix_apple_orchard_build_size": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "o_firecooldown": {
                      "contents": {
                          "value": {
                              "enabled": false,
                              "sliderValue": 2000
                          }
                      }
                  },
                  "o_freetrader": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "o_healer": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "o_responsivegates": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "o_shfy": {
                      "o_shfy_beer": {
                          "enabled": {
                              "contents": {
                                  "value": false
                              }
                          }
                      },
                      "o_shfy_religion": {
                          "enabled": {
                              "contents": {
                                  "value": false
                              }
                          }
                      },
                      "o_shfy_peasantspawnrate": {
                          "enabled": {
                              "contents": {
                                  "value": false
                              }
                          }
                      },
                      "o_shfy_resourcequantity": {
                          "enabled": {
                              "contents": {
                                  "value": false
                              }
                          }
                      }
                  },
                  "u_arabwall": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "u_arabxbow": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "u_laddermen": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "u_spearmen": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "u_spearmen_run": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "o_fix_map_sending": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "o_fix_rapid_deletion_bug": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "o_fix_baker_disappear": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "o_fix_fletcher_bug": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "o_fix_ladderclimb": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "o_fix_moat_digging_unit_disappearing": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "o_restore_arabian_engineer_speech": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "u_fireballistafix": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "u_fix_applefarm_blocking": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "u_fix_lord_animation_stuck_movement": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "u_tanner_fix": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "o_change_siege_engine_spawn_position_catapult": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "o_increase_path_update_tick_rate": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "o_onlyai": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "o_override_identity_menu": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "o_playercolor": {
                      "contents": {
                          "value": {
                              "enabled": false,
                              "choice": "red"
                          }
                      }
                  },
                  "o_stop_player_keep_rotation": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "o_xtreme": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "o_armory_marketplace_weapon_order_fix": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "o_fast_placing": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "o_default_multiplayer_speed": {
                      "contents": {
                          "value": {
                              "enabled": false,
                              "sliderValue": 50
                          }
                      }
                  },
                  "o_engineertent": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "o_gamespeed": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "o_keys": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  },
                  "o_moatvisibility": {
                      "enabled": {
                          "contents": {
                              "value": false
                          }
                      }
                  }
              }
          },
          "aicloader": {
              "config": {
                  "failureHandling": {
                      "contents": {
                          "value": "ERROR_LOG"
                      }
                  }
              }
          },
          "graphicsApiReplacer": {
              "config": {
                  "window": {
                      "type": {
                          "contents": {
                              "value": "window"
                          }
                      },
                      "width": {
                          "contents": {
                              "value": 1280
                          }
                      },
                      "height": {
                          "contents": {
                              "value": 720
                          }
                      },
                      "pos": {
                          "contents": {
                              "value": "middle"
                          }
                      },
                      "continueOutOfFocus": {
                          "contents": {
                              "value": "pause"
                          }
                      }
                  },
                  "graphic": {
                      "api": {
                          "contents": {
                              "value": "DirectX"
                          }
                      },
                      "filterLinear": {
                          "contents": {
                              "value": true
                          }
                      },
                      "vsync": {
                          "contents": {
                              "value": true
                          }
                      },
                      "waitWithGLFinish": {
                          "contents": {
                              "value": false
                          }
                      },
                      "pixFormat": {
                          "contents": {
                              "value": "argb1555"
                          }
                      },
                      "debug": {
                          "contents": {
                              "value": "none"
                          }
                      }
                  },
                  "control": {
                      "clipCursor": {
                          "contents": {
                              "value": true
                          }
                      },
                      "scrollActive": {
                          "contents": {
                              "value": true
                          }
                      },
                      "margin": {
                          "contents": {
                              "value": 0
                          }
                      },
                      "padding": {
                          "contents": {
                              "value": 0
                          }
                      }
                  }
              }
          },
          "running-units": {
              "config": {
                  "macemen": {
                      "running": {
                          "general": {
                              "contents": {
                                  "value": false
                              }
                          },
                          "ai": {
                              "contents": {
                                  "value": "aic_run_if_not_defined"
                              }
                          }
                      }
                  },
                  "slingers": {
                      "running": {
                          "general": {
                              "contents": {
                                  "value": false
                              }
                          },
                          "ai": {
                              "contents": {
                                  "value": "aic_run_if_not_defined"
                              }
                          }
                      }
                  },
                  "slaves": {
                      "running": {
                          "general": {
                              "contents": {
                                  "value": false
                              }
                          },
                          "ai": {
                              "contents": {
                                  "value": "aic_run_if_not_defined"
                              }
                          }
                      }
                  },
                  "spearmen": {
                      "running": {
                          "general": {
                              "contents": {
                                  "value": false
                              }
                          },
                          "ai": {
                              "contents": {
                                  "value": "aic_run_if_not_defined"
                              }
                          }
                      }
                  }
              }
          },
          "maploader": {
              "config": {
                  "disable-game-maps": {
                      "contents": {
                          "value": false
                      }
                  },
                  "disable-user-maps": {
                      "contents": {
                          "value": false
                      }
                  },
                  "disable-user-savs": {
                      "contents": {
                          "value": false
                      }
                  },
                  "disable-game-maps-extreme": {
                      "contents": {
                          "value": true
                      }
                  },
                  "disable-user-maps-extreme": {
                      "contents": {
                          "value": true
                      }
                  },
                  "disable-user-savs-extreme": {
                      "contents": {
                          "value": false
                      }
                  },
                  "extra-map-directory": {
                      "contents": {
                          "value": ""
                      }
                  },
                  "extra-map-extreme-directory": {
                      "contents": {
                          "value": "maps"
                      }
                  }
              }
          },
          "winProcHandler": {
              "config": {}
          },
          "files": {
              "config": {}
          }
      },
      "plugins": {
          "extreme-is-the-new-normal": {
              "config": {}
          }
      },
      "load-order": [
          {
              "extension": "ucp2-legacy",
              "version": "2.15.1"
          },
          {
              "extension": "winProcHandler",
              "version": "0.2.0"
          },
          {
              "extension": "graphicsApiReplacer",
              "version": "1.2.0"
          },
          {
              "extension": "files",
              "version": "1.1.0"
          },
          {
              "extension": "maploader",
              "version": "1.0.0"
          },
          {
              "extension": "extreme-is-the-new-normal",
              "version": "1.0.0"
          },
          {
              "extension": "aicloader",
              "version": "1.1.1"
          },
          {
              "extension": "running-units",
              "version": "1.0.1"
          }
      ]
  }
}`;

const extensionsJson = `
[
    {
        "name": "aicloader",
        "version": "1.1.1",
        "type": "module",
        "definition": {
            "name": "aicloader",
            "display-name": "AIC Loader",
            "version": "1.1.1",
            "author": "gynt, TheRedDaemon",
            "meta": {
                "version": "1.0.0"
            },
            "type": "module",
            "dependencies": {}
        },
        "configEntries": {}
    },
    {
        "name": "files",
        "version": "1.1.0",
        "type": "module",
        "definition": {
            "name": "files",
            "version": "1.1.0",
            "author": [
                "gynt",
                "TheRedDaemon"
            ],
            "dependencies": {
                "frontend": ">=1.0.2",
                "framework": ">=3.0.4"
            },
            "meta": {
                "version": "1.0.0"
            },
            "type": "module",
            "display-name": "files"
        },
        "configEntries": {}
    },
    {
        "name": "graphicsApiReplacer",
        "version": "1.2.0",
        "type": "module",
        "definition": {
            "name": "graphicsApiReplacer",
            "display-name": "Graphics API Replacer",
            "version": "1.2.0",
            "author": "TheRedDaemon",
            "meta": {
                "version": "1.0.0"
            },
            "type": "module",
            "dependencies": {
                "winProcHandler": ">= 0.1.0"
            }
        },
        "configEntries": {}
    },
    {
        "name": "maploader",
        "version": "1.0.0",
        "type": "module",
        "definition": {
            "name": "maploader",
            "version": "1.0.0",
            "author": "gynt",
            "game": [
                "SHC==1.41"
            ],
            "dependencies": {
                "files": ">= 0.2.0"
            },
            "meta": {
                "version": "1.0.0"
            },
            "type": "module",
            "display-name": "maploader"
        },
        "configEntries": {}
    },
    {
        "name": "running-units",
        "version": "1.0.1",
        "type": "module",
        "definition": {
            "name": "running-units",
            "display-name": "Running Units",
            "version": "1.0.1",
            "author": "gynt",
            "dependencies": {
                "frontend": ">=1.0.5",
                "framework": ">=3.0.4",
                "aicloader": ">=1.1.0"
            },
            "type": "module"
        },
        "configEntries": {}
    },
    {
        "name": "ucp2-legacy",
        "version": "2.15.1",
        "type": "module",
        "definition": {
            "name": "ucp2-legacy",
            "display-name": "UCP2-Legacy",
            "version": "2.15.1",
            "default": true,
            "game": [
                "SHC==1.41",
                "SHCE==1.41"
            ],
            "meta": {
                "version": "1.0.0"
            },
            "dependencies": {},
            "type": "module"
        },
        "configEntries": {}
    },
    {
        "name": "winProcHandler",
        "version": "0.2.0",
        "type": "module",
        "definition": {
            "name": "winProcHandler",
            "display-name": "WinProc Handler",
            "version": "0.2.0",
            "author": "TheRedDaemon",
            "meta": {
                "version": "1.0.0"
            },
            "type": "module",
            "dependencies": {}
        },
        "configEntries": {}
    },
    {
        "name": "extreme-is-the-new-normal",
        "version": "1.0.0",
        "type": "plugin",
        "definition": {
            "name": "extreme-is-the-new-normal",
            "author": "gynt",
            "version": "1.0.0",
            "dependencies": {
                "maploader": "^1.0.0",
                "graphicsApiReplacer": "^1.2.0",
                "ucp2-legacy": "^2.15.1"
            },
            "type": "plugin",
            "display-name": "extreme-is-the-new-normal"
        },
        "configEntries": {
            "maploader.disable-game-maps-extreme": {
                "contents": {
                    "suggested-value": true
                }
            },
            "maploader.disable-user-maps-extreme": {
                "contents": {
                    "suggested-value": true
                }
            },
            "maploader.extra-map-extreme-directory": {
                "contents": {
                    "suggested-value": "maps"
                }
            }
        }
    }
]
`;

// temp2.map((ext) => ({name: ext.name, version: ext.version, type: ext.type, definition: {...ext.definition, dependencies: Object.fromEntries(Object.entries(ext.definition.dependencies).map((v) => [v[0], v[1].raw]))}, configEntries: ext.configEntries}))

describe('attemptStrategies', () => {
  test('attemptStrategies on valid state', async () => {
    const extensionsState: ExtensionsState =
      deserializeSimplifiedSerializedExtensionsStateFromExtensions(
        JSON.parse(extensionsJson),
      );

    const config = JSON.parse(configFileJSON);

    const strategyResult = await attemptStrategies(
      config,
      extensionsState,
      () => {},
    );

    expect(strategyResult.status === 'ok').toBe(true);

    if (strategyResult.status === 'ok') {
      const ids = strategyResult.newExtensionsState.activeExtensions.map(
        (ext) => extensionToID(ext),
      );

      expect(ids).toStrictEqual([
        'running-units@1.0.1',
        'aicloader@1.1.1',
        'extreme-is-the-new-normal@1.0.0',
        'maploader@1.0.0',
        'files@1.1.0',
        'graphicsApiReplacer@1.2.0',
        'winProcHandler@0.2.0',
        'ucp2-legacy@2.15.1',
      ]);
    }
  });

  test('fullStrategy on valid state', async () => {
    const extensionsState: ExtensionsState =
      deserializeSimplifiedSerializedExtensionsStateFromExtensions(
        JSON.parse(extensionsJson),
      );

    const config = JSON.parse(configFileJSON);
    const strategyResult = await fullStrategy(
      extensionsState,
      config,
      () => {},
    );

    expect(strategyResult.status === 'ok').toBe(true);

    if (strategyResult.status === 'ok') {
      const ids = strategyResult.newExtensionsState.activeExtensions.map(
        (ext) => extensionToID(ext),
      );

      expect(ids).toStrictEqual([
        'running-units@1.0.1',
        'aicloader@1.1.1',
        'extreme-is-the-new-normal@1.0.0',
        'maploader@1.0.0',
        'files@1.1.0',
        'graphicsApiReplacer@1.2.0',
        'winProcHandler@0.2.0',
        'ucp2-legacy@2.15.1',
      ]);
    }
  });

  test('sparseStrategy on valid state', async () => {
    const extensionsState: ExtensionsState =
      deserializeSimplifiedSerializedExtensionsStateFromExtensions(
        JSON.parse(extensionsJson),
      );

    const config = JSON.parse(configFileJSON);
    const strategyResult = await sparseStrategy(
      extensionsState,
      config,
      () => {},
    );

    expect(strategyResult.status === 'ok').toBe(true);

    if (strategyResult.status === 'ok') {
      const ids = strategyResult.newExtensionsState.activeExtensions.map(
        (ext) => extensionToID(ext),
      );

      expect(ids).toStrictEqual([
        'extreme-is-the-new-normal@1.0.0',
        'maploader@1.0.0',
        'files@1.1.0',
        'ucp2-legacy@2.15.1',
        'graphicsApiReplacer@1.2.0',
        'winProcHandler@0.2.0',
        'running-units@1.0.1',
        'aicloader@1.1.1',
      ]);
    }
  });
});
