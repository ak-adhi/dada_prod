
-- Select data from business_data
SELECT * FROM dada.business_data LIMIT 5;

-- Insert new data
select * from dada.prompt_injection_attacks;

select * from dada.llm_config;


select max(attack_id) from dada.prompt_injection_attacks;

SELECT attack_id, attack_family, attack_name, attack_prompt, usecase 
            FROM dada.prompt_injection_attacks ;

select distinct attack_family from dada.prompt_injection_attacks;

UPDATE dada.prompt_injection_attacks 
SET attack_family = 'Extracting the prompt template attack variants' 
WHERE attack_family = 'Extracting_the_prompt_template_attack_variants';

UPDATE dada.prompt_injection_attacks 
SET attack_family = 'Changing input attack format attack variants' 
WHERE attack_family = 'Changing_input_attack_format_attack_variants';

UPDATE dada.prompt_injection_attacks 
SET attack_family = 'Prompted persona switches attack variants' 
WHERE attack_family = 'Prompted_persona_switches_attack_variants';

UPDATE dada.prompt_injection_attacks 
SET attack_family = 'Alternating languages and escape characters attack variants' 
WHERE attack_family = 'Alternating_languages_and_escape_characters_attack_variants';

UPDATE dada.prompt_injection_attacks 
SET attack_family = 'Rephrasing obfuscating common attacks attack variants' 
WHERE attack_family = 'Rephrasing_obfuscating_common_attacks_attack_variants';

UPDATE dada.prompt_injection_attacks 
SET attack_family = 'Augmenting the prompt template attack variants' 
WHERE attack_family = 'Augmenting_the_prompt_template_attack_variants';

UPDATE dada.prompt_injection_attacks 
SET attack_family = 'Exploiting friendliness and trust attack variants' 
WHERE attack_family = 'Exploiting_friendliness_and_trust_attack_variants';

UPDATE dada.prompt_injection_attacks 
SET attack_family = 'Changing output format common attacks attack variants' 
WHERE attack_family = 'Changing_output_format_common_attacks_attack_variants';

UPDATE dada.prompt_injection_attacks 
SET attack_family = 'Fake completion prefilling attack variants' 
WHERE attack_family = 'Fake_completion_prefilling_attack_variants';

UPDATE dada.prompt_injection_attacks 
SET attack_family = 'Hybrid attack variants' 
WHERE attack_family = 'Hybrid_attack_variants';

UPDATE dada.prompt_injection_attacks 
SET attack_family = 'Ignoring the prompt template attack variants' 
WHERE attack_family = 'Ignoring_the_prompt_template_attack_variants';
