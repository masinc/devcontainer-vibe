# Initialize Starship prompt for interactive sessions only
if status is-interactive; and command -q starship
    starship init fish | source
end