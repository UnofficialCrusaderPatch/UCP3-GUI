const poc = `

# modules b is activated by the user. a is included as well because b depends on it.

# ucp/modules/a-0.0.1/options.yml
- name: option1
  type: boolean
  url: option1
  value:
    default: false
- name: option2
  type: integer
  url: option2
  value: 
    default: 50
    min: 1
    max: 10
  
# ucp/modules/b-0.0.1/config.yml
modules:
  a:
    option1:
      required-value: true
    option2:
      required-range:
        min: 75
        max: 125
      suggested-value: 100

# Final processed and merged config
modules:
  a:
    version: 0.0.1
    active: true
    config:
      option1: true
      option2: 100
  b:
    version: 0.0.1
    active: true

`;

const aiSwapperPoc = `

# modules b is activated by the user. a is included as well because b depends on it.

# ucp/modules/aiSwapper-0.0.1/options.yml
- name: providers
  type: set
  url: providers
  value:
    default: []
- name: aicConfiguration
  type: complex
  url: aicConfiguration
  value: 
    default: []
  
# ucp/plugins/newRat-0.0.1/config.yml
modules:
  aiSwapper:
    providers:
    - name: NewRat
      # This path expands to "ucp/plugins/newLord-0.0.1/resources/aic/NewRat"
      path: ~/resources/aic/NewRat
      supplies: [aic, aiv, sfx, gfx, bink]
    aicConfiguration:
    - name: newLord-0.0.1/NewRat
      suggested-override-lord: rat

# Final processed and merged config
modules:
  aiSwapper:
    version: 0.0.1
    active: true
    config:
      providers:
      - name: NewRat
        path: ucp/plugins/newLord-0.0.1/resources/aic/NewRat/resources/aic/NewRat
        supplies: [aic, aiv, sfx, gfx, bink]
      aicConfiguration:
      - name: newLord-0.0.1/NewRat
        override-lord: rat
  newRat:
    version: 0.0.1
    active: true

`;
