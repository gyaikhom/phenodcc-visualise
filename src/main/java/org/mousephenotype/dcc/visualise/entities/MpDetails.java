/*
 * Copyright 2013 Medical Research Council Harwell.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */package org.mousephenotype.dcc.visualise.entities;

/**
 * Entity used in AnnotationData to represent ontology term.
 * 
 * @author Gagarine Yaikhom <g.yaikhom@har.mrc.ac.uk>
 */
public class MpDetails {

    private String mpTerm;
    private String description;
    private String outcome;

    public MpDetails(String mpTerm, String description, String outcome) {
        this.mpTerm = mpTerm;
        this.description = description;
        this.outcome = outcome;
    }

    public String getMpTerm() {
        return mpTerm;
    }

    public void setMpTerm(String mpTerm) {
        this.mpTerm = mpTerm;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getOutcome() {
        return outcome;
    }

    public void setOutcome(String outcome) {
        this.outcome = outcome;
    }
}
