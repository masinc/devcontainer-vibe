{ config, pkgs, ... }:

{
  home.username = "vscode";
  home.homeDirectory = "/home/vscode";
  home.stateVersion = "23.11";

  programs.home-manager.enable = true;
  
  
  home.packages = with pkgs; [
    usage
    babelfish
    ripgrep
    ripgrep-all
    neovim
    fd
    eza
    jq
    yq-go
    fzf
    starship
    go-task
    gh
    ghq
    bat
    yazi    
    delta
  ];

  home.shellAliases = {
    vi = "nvim";
    vim = "nvim";
  };

  home.sessionVariables = {
    EDITOR = "nvim";
    VISUAL = "nvim";
  };
}
