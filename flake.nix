{
  description = "Pomotasker - SvelteKit habit tracker";

  inputs = { nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable"; };

  outputs = { self, nixpkgs }:
    let
      forEachSystem = f:
        nixpkgs.lib.genAttrs [ "x86_64-linux" "aarch64-linux" ]
        (system: f nixpkgs.legacyPackages.${system});

      app = pkgs:
        pkgs.buildNpmPackage {
          pname = "pomotasker";
          version = "0.1.0";
          src = ./.;
          npmDepsHash = "sha256-O4somChwMU7OzTPni3jPWeWahuPKeW1TymVW7sr0gNc=";
          nativeBuildInputs = [ pkgs.python3 ];
          buildInputs = [ pkgs.sqlite ];
          dontNpmBuild = false;
          npmBuildScript = "build";
          installPhase = ''
            mkdir -p $out/lib/node_modules/pomotasker-web
            cp -r package.json build node_modules data $out/lib/node_modules/pomotasker-web/
          '';
        };
    in {
      packages = forEachSystem (pkgs: { default = app pkgs; });

      apps = forEachSystem (pkgs: {
        default = {
          type = "app";
          program = "${pkgs.writeShellScript "pomotasker" ''
            exec ${pkgs.nodejs_22}/bin/node ${
              (app pkgs)
            }/lib/node_modules/pomotasker-web/build/index.js
          ''}";
        };
      });

      nixosModules.pomotasker = { config, lib, pkgs, ... }:
        let
          pkg = self.packages.${pkgs.system}.default;
          base = "${pkg}/lib/node_modules/pomotasker-web";
        in {
          options.pomotasker = {
            enable = lib.mkEnableOption "Pomotasker";
            port = lib.mkOption {
              type = lib.types.int;
              default = 3000;
              description = "Port";
            };
            host = lib.mkOption {
              type = lib.types.str;
              default = "127.0.0.1";
              description = "Bind address (127.0.0.1 for nginx proxy)";
            };
            dataDir = lib.mkOption {
              type = lib.types.path;
              default = "/var/lib/pomotasker";
              description = "Persistent data dir (DB lives here)";
            };
          };

          config = lib.mkIf config.pomotasker.enable {
            users.users.pomotasker = {
              isSystemUser = true;
              group = "pomotasker";
            };
            users.groups.pomotasker = { };

            systemd.services.pomotasker = {
              description = "Pomotasker";
              after = [ "network.target" ];
              serviceConfig = {
                Type = "simple";
                ExecStart = "${pkgs.nodejs_22}/bin/node ${base}/build/index.js";
                WorkingDirectory = config.pomotasker.dataDir;
                User = "pomotasker";
                Group = "pomotasker";
                Restart = "on-failure";
                RestartSec = 5;
                Environment = [
                  "PORT=${toString config.pomotasker.port}"
                  "HOST=${config.pomotasker.host}"
                  "NODE_PATH=${base}/node_modules"
                ];
              };
              preStart = ''
                mkdir -p ${config.pomotasker.dataDir}/data
                if [ ! -f ${config.pomotasker.dataDir}/data/pomotasker.db ]; then
                  cp ${base}/data/pomotasker.db ${config.pomotasker.dataDir}/data/
                fi
                chown -R pomotasker:pomotasker ${config.pomotasker.dataDir}
              '';
            };
          };
        };
    };
}
